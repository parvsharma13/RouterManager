import https from 'node:https';
import { URL } from 'node:url';
import {
  type RouterSession,
  aesEncrypt,
  aesDecrypt,
  rsaEncryptPkcs1,
  randomIvFull,
  randomAesKey,
  isSessionFresh,
} from './session.js';
import { RouterAuthError, RouterUnreachableError, RouterUnsupportedFeatureError } from './errors.js';

export interface RouterClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  allowSelfSigned: boolean;
}

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

// Implements the login/session/DAL protocol documented in docs/api-notes.md.
// Single module-level singleton (see config/credentials.ts + index.ts) — this app is
// single-tenant and local-only, so one long-lived authenticated session is all we need.
export class RouterClient {
  private session: RouterSession | null = null;
  private loginInFlight: Promise<void> | null = null;
  // Reused across every request instead of a fresh TCP+TLS handshake each time — the
  // router is a small embedded IAD, and opening a new connection per request (which is
  // what a plain https.request without a shared keep-alive agent does) is enough load,
  // under a handful of concurrent page loads, to make its own web server time out on us.
  private readonly agent: https.Agent;

  constructor(private readonly config: RouterClientConfig) {
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 4,
      rejectUnauthorized: !config.allowSelfSigned,
    });
  }

  private rawRequest(
    path: string,
    opts: { method?: string; body?: string; headers?: Record<string, string> } = {}
  ): Promise<RawResponse> {
    const url = new URL(path, this.config.baseUrl);
    return new Promise((resolve, reject) => {
      const data = opts.body ? Buffer.from(opts.body) : undefined;
      const req = https.request(
        url,
        {
          method: opts.method ?? 'GET',
          agent: this.agent,
          timeout: 15_000,
          headers: {
            ...(data ? { 'Content-Type': 'application/json', 'Content-Length': String(data.length) } : {}),
            ...opts.headers,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            })
          );
        }
      );
      req.on('timeout', () => req.destroy(new RouterUnreachableError(`Timed out reaching router at ${url}`)));
      req.on('error', (err) => reject(new RouterUnreachableError(`Could not reach router: ${err.message}`)));
      if (data) req.write(data);
      req.end();
    });
  }

  async login(): Promise<void> {
    // Coalesce concurrent callers into a single login attempt.
    if (this.loginInFlight) return this.loginInFlight;
    this.loginInFlight = this.doLogin().finally(() => {
      this.loginInFlight = null;
    });
    return this.loginInFlight;
  }

  private async doLogin(): Promise<void> {
    const rsaRes = await this.rawRequest('/getRSAPublickKey');
    let publicKey: string;
    try {
      publicKey = JSON.parse(rsaRes.body).RSAPublicKey;
    } catch {
      throw new RouterUnreachableError('Unexpected response fetching RSA public key — is this the expected router?');
    }

    const loginPayload = JSON.stringify({
      Input_Account: this.config.username,
      Input_Passwd: Buffer.from(this.config.password, 'utf8').toString('base64'),
      currLang: 'en',
      RememberPassword: 0,
      SHA512_password: '',
    });

    const aesKey = randomAesKey();
    const ivFull = randomIvFull();
    const ciphertext = aesEncrypt(loginPayload, aesKey, ivFull);
    const rsaEncryptedKey = rsaEncryptPkcs1(aesKey.toString('base64'), publicKey);

    const body = JSON.stringify({
      content: ciphertext.toString('base64'),
      iv: ivFull.toString('base64'),
      key: rsaEncryptedKey.toString('base64'),
    });

    const loginRes = await this.rawRequest('/UserLogin', { method: 'POST', body });
    const setCookie = loginRes.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : '';

    let parsed: { content?: string; iv?: string };
    try {
      parsed = JSON.parse(loginRes.body);
    } catch {
      throw new RouterAuthError('Login response was not valid JSON');
    }
    if (!parsed.content || !parsed.iv || !cookie) {
      throw new RouterAuthError('Login response missing expected fields — credentials rejected or router changed');
    }

    const decrypted = JSON.parse(aesDecrypt(parsed.content, aesKey, Buffer.from(parsed.iv, 'base64')));
    if (decrypted.result !== 'ZCFG_SUCCESS') {
      throw new RouterAuthError(`Login rejected: ${decrypted.result ?? 'unknown error'}`);
    }

    this.session = {
      aesKey,
      cookie,
      csrfToken: decrypted.sessionkey,
      loginLevel: decrypted.loginLevel,
      establishedAt: Date.now(),
    };
  }

  private async ensureSession(): Promise<RouterSession> {
    if (!isSessionFresh(this.session)) {
      await this.login();
    }
    if (!this.session) throw new RouterAuthError('No session established after login');
    return this.session;
  }

  /** GET /cgi-bin/DAL?oid=<oid> — see docs/api-notes.md */
  async daoGet<T = unknown>(oid: string): Promise<T> {
    return this.withRetry(async () => {
      const session = await this.ensureSession();
      const res = await this.rawRequest(`/cgi-bin/DAL?DalGetOneObject=y&oid=${encodeURIComponent(oid)}`, {
        headers: { Cookie: session.cookie, CSRFToken: session.csrfToken },
      });
      return this.decryptDalResponse<T>(res, session, oid);
    });
  }

  /** POST or PUT /cgi-bin/DAL?oid=<oid> with an AES-encrypted JSON body — see docs/api-notes.md */
  async daoSet<T = unknown>(oid: string, payload: unknown, method: 'POST' | 'PUT' = 'PUT'): Promise<T> {
    return this.withRetry(async () => {
      const session = await this.ensureSession();
      const ivFull = randomIvFull();
      const ciphertext = aesEncrypt(JSON.stringify(payload), session.aesKey, ivFull);
      const body = JSON.stringify({ content: ciphertext.toString('base64'), iv: ivFull.toString('base64') });
      const res = await this.rawRequest(`/cgi-bin/DAL?oid=${encodeURIComponent(oid)}`, {
        method,
        body,
        headers: { Cookie: session.cookie, CSRFToken: session.csrfToken },
      });
      return this.decryptDalResponse<T>(res, session, oid);
    });
  }

  /** Non-DAL /cgi-bin/<name> endpoints (Reboot, PasswordReset, ...) — same encrypted-body convention. */
  async cgiCall<T = unknown>(name: string, payload?: unknown): Promise<T> {
    return this.withRetry(async () => {
      const session = await this.ensureSession();
      let body: string | undefined;
      const headers: Record<string, string> = { Cookie: session.cookie, CSRFToken: session.csrfToken };
      if (payload !== undefined) {
        const ivFull = randomIvFull();
        const ciphertext = aesEncrypt(JSON.stringify(payload), session.aesKey, ivFull);
        body = JSON.stringify({ content: ciphertext.toString('base64'), iv: ivFull.toString('base64') });
      }
      const res = await this.rawRequest(`/cgi-bin/${name}`, { method: 'POST', body, headers });
      return this.decryptDalResponse<T>(res, session, name);
    });
  }

  private decryptDalResponse<T>(res: RawResponse, session: RouterSession, oidOrName: string): T {
    let parsed: { content?: string; iv?: string; result?: string };
    try {
      parsed = JSON.parse(res.body);
    } catch {
      throw new RouterUnreachableError(`Non-JSON response from router for "${oidOrName}" (status ${res.status})`);
    }
    let data: any = parsed;
    if (parsed.content && parsed.iv) {
      const decrypted = aesDecrypt(parsed.content, session.aesKey, Buffer.from(parsed.iv, 'base64'));
      data = JSON.parse(decrypted);
    }
    if (data.result && data.result !== 'ZCFG_SUCCESS') {
      throw new RouterUnsupportedFeatureError(oidOrName);
    }
    return data as T;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      // A non-ZCFG_SUCCESS result usually does mean "unsupported oid" (that's how we built
      // the capability map), but we've also seen it happen when the session went stale for
      // an oid we know is supported — the router doesn't send a distinct auth-failure shape
      // we can detect, it just answers the still-encrypted request with an error result. So
      // treat it the same as an auth failure: force a fresh login and retry once before
      // concluding the feature is actually unsupported.
      if (err instanceof RouterAuthError || err instanceof RouterUnsupportedFeatureError) {
        this.session = null;
        return await fn(); // one transparent retry after a forced re-login
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    if (!this.session) return;
    try {
      await this.rawRequest('/cgi-bin/UserLogout', {
        headers: { Cookie: this.session.cookie, CSRFToken: this.session.csrfToken },
      });
    } finally {
      this.session = null;
    }
  }
}

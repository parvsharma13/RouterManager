import crypto from 'node:crypto';

// See docs/api-notes.md "Login flow": this mirrors the router's own web app exactly,
// reverse-engineered from its bundled JS and confirmed live against the device.

export interface RouterSession {
  aesKey: Buffer; // 32 bytes, reused for every request/response for the life of the session
  cookie: string; // raw "Session=..." cookie pair
  csrfToken: string; // sent as the CSRFToken header on every /cgi-bin/* call
  loginLevel: string;
  establishedAt: number;
}

export function aesEncrypt(plaintextUtf8: string, key32: Buffer, iv32: Buffer): Buffer {
  const cipher = crypto.createCipheriv('aes-256-cbc', key32, iv32.subarray(0, 16));
  return Buffer.concat([cipher.update(plaintextUtf8, 'utf8'), cipher.final()]);
}

export function aesDecrypt(ciphertextB64: string, key32: Buffer, iv32: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key32, iv32.subarray(0, 16));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
}

export function rsaEncryptPkcs1(plainUtf8: string, publicKeyPem: string): Buffer {
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plainUtf8, 'utf8')
  );
}

// Only the first 16 bytes of this 32-byte buffer are ever used as a real AES-CBC IV;
// the router's own client generates/sends the full 32 bytes regardless (see api-notes.md).
export function randomIvFull(): Buffer {
  return crypto.randomBytes(32);
}

export function randomAesKey(): Buffer {
  return crypto.randomBytes(32);
}

const SESSION_MAX_AGE_MS = 8 * 60 * 1000; // proactively re-login before the observed ~10min timeout

export function isSessionFresh(session: RouterSession | null): session is RouterSession {
  return session !== null && Date.now() - session.establishedAt < SESSION_MAX_AGE_MS;
}

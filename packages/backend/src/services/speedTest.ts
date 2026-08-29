import type { SpeedTestResult } from '@router-manager/shared';

// No confirmed router-native speed-test/diagnostics OID exists on this device: the full
// known + suspected OID catalogue in docs/api-notes.md has nothing that matches, and TR-069
// (tr69) diagnostics are explicitly off-limits (ISP-managed, read-only by design). So this
// measures from the backend process itself (the Node server on the LAN, not the browser)
// against Cloudflare's public speed-test endpoints (the same ones several open-source
// speed-test CLIs use). That's closer to "the router's-eye view" of the connection than an
// in-browser test would be, and sidesteps CORS entirely. If a hidden native diagnostics OID
// turns up later (grepping the router's own web app bundle live, same technique as every
// other OID in this project), swap this out and set `source: 'router-native'`.

const DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 20_000;

function mbps(bytes: number, ms: number): number {
  const bitsPerSecond = (bytes * 8) / (ms / 1000);
  return Math.round((bitsPerSecond / 1_000_000) * 10) / 10;
}

async function measurePing(): Promise<number | null> {
  try {
    const start = performance.now();
    await fetch('https://speed.cloudflare.com/__down?bytes=0', { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}

async function measureDownload(): Promise<number> {
  const start = performance.now();
  const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${DOWNLOAD_BYTES}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const buf = await res.arrayBuffer();
  return mbps(buf.byteLength, performance.now() - start);
}

async function measureUpload(): Promise<number | null> {
  try {
    const payload = new Uint8Array(UPLOAD_BYTES);
    const start = performance.now();
    await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return mbps(payload.byteLength, performance.now() - start);
  } catch {
    // Upload-endpoint behavior/availability isn't guaranteed the way download is; don't
    // fail the whole test just because upload couldn't be measured.
    return null;
  }
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  // Sequential, not parallel: running these concurrently would have them contend for the
  // same bandwidth and skew each other's numbers.
  const pingMs = await measurePing();
  const downloadMbps = await measureDownload();
  const uploadMbps = await measureUpload();
  return {
    downloadMbps,
    uploadMbps,
    pingMs,
    measuredAt: new Date().toISOString(),
    source: 'backend',
  };
}

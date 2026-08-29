import QRCode from 'qrcode';

// Standard WIFI: URI format (used by iOS/Android camera scanners). Generated and rendered
// entirely client-side — the PSK never leaves the browser, no network call involved.
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1');
}

export function buildWifiQrPayload(params: { ssid: string; psk: string; securityMode: string; hidden: boolean }): string {
  const isOpen = /open|none/i.test(params.securityMode) || !params.psk;
  const type = isOpen ? 'nopass' : /wep/i.test(params.securityMode) ? 'WEP' : 'WPA';
  const parts = [
    `T:${type}`,
    `S:${escapeWifiField(params.ssid)}`,
    ...(isOpen ? [] : [`P:${escapeWifiField(params.psk)}`]),
    `H:${params.hidden ? 'true' : 'false'}`,
  ];
  return `WIFI:${parts.join(';')};;`;
}

export function generateWifiQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { width: 240, margin: 1 });
}

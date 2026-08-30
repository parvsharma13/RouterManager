import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.MATERIAL_AUDIT_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.MATERIAL_AUDIT_OUTPUT || '/tmp/router-manager-material-audit';
fs.mkdirSync(outputDir, { recursive: true });

const now = new Date().toISOString();
const devices = [
  { macAddress: 'AA:BB:CC:DD:EE:01', hostName: 'Parv-Pixel', customName: 'Parv’s Pixel', displayName: 'Parv’s Pixel', ipAddress: '192.168.1.21', active: true, interfaceType: 'Wi-Fi', connectionType: 'Wi-Fi 6 · 5GHz', signalStrength: -43, icon: 'phone', notes: 'Primary phone', groupId: 1, isNew: false, firstSeenAt: '2026-07-02T09:10:00.000Z', lastSeenAt: now },
  { macAddress: 'AA:BB:CC:DD:EE:02', hostName: 'Living-Room-TV', customName: 'Living room TV', displayName: 'Living room TV', ipAddress: '192.168.1.33', active: true, interfaceType: 'Ethernet', connectionType: 'Ethernet', signalStrength: null, icon: 'tv', notes: null, groupId: 1, isNew: false, firstSeenAt: '2026-06-18T18:30:00.000Z', lastSeenAt: now },
  { macAddress: 'AA:BB:CC:DD:EE:03', hostName: 'Unknown', customName: null, displayName: 'Unknown device', ipAddress: '192.168.1.48', active: true, interfaceType: 'Wi-Fi', connectionType: 'Wi-Fi 5 · 2.4GHz', signalStrength: -67, icon: 'other', notes: null, groupId: null, isNew: true, firstSeenAt: now, lastSeenAt: now },
  { macAddress: 'AA:BB:CC:DD:EE:04', hostName: 'Work-Laptop', customName: 'Work laptop', displayName: 'Work laptop', ipAddress: '192.168.1.19', active: false, interfaceType: 'Wi-Fi', connectionType: 'Wi-Fi 6 · 5GHz', signalStrength: null, icon: 'laptop', notes: null, groupId: 2, isNew: false, firstSeenAt: '2026-05-12T08:00:00.000Z', lastSeenAt: '2026-08-29T17:22:00.000Z' },
];
const events = [
  { id: 1, macAddress: devices[2].macAddress, displayName: devices[2].displayName, eventType: 'new_device', occurredAt: now, detail: 'Unknown device joined on 2.4GHz' },
  { id: 2, macAddress: devices[0].macAddress, displayName: devices[0].displayName, eventType: 'device_online', occurredAt: '2026-08-30T10:38:00.000Z', detail: 'Connected on 5GHz' },
  { id: 3, macAddress: null, displayName: 'Network check', eventType: 'diagnostic_result', occurredAt: '2026-08-29T20:16:00.000Z', detail: 'All essential checks passed' },
  { id: 4, macAddress: null, displayName: 'Wi-Fi', eventType: 'settings_changed', occurredAt: '2026-08-28T18:02:00.000Z', detail: '5GHz network settings updated' },
];
const capabilityKeys = ['status','wan','wlan','lanhosts','nat','dns','firewall_acl','cyber_secure','paren_ctl','qos','sip_account','usb_info','user_account','tr69','wlan_sch_access','scheduler'];
const capabilities = Object.fromEntries(capabilityKeys.map((key) => [key, {
  key,
  label: key,
  read: 'available',
  write: key === 'wlan' ? 'verified' : 'blocked',
  reason: key === 'wlan' ? 'Verified on this firmware.' : 'Read access only.',
  source: 'live-probe',
  lastVerifiedFirmware: key === 'wlan' ? 'V5.50(ABVY.4)C0' : null,
}]));

function responseFor(url, method) {
  const pathname = new URL(url).pathname.replace(/^\/api/, '');
  if (pathname === '/auth/login') return { token: 'visual-audit', expiresAt: '2099-01-01T00:00:00.000Z', user: { username: 'admin' } };
  if (pathname === '/auth/logout') return { ok: true };
  if (pathname === '/capabilities') return { capabilities, compatibility: { manufacturer: 'Zyxel', model: 'EX3301-T0', firmware: 'V5.50(ABVY.4)C0', supportLevel: 'verified', detectedAt: now, message: 'Verified Hyperoptic Zyxel EX3301 support.' } };
  if (pathname === '/dashboard') return { system: { manufacturer: 'Zyxel', modelName: 'EX3301-T0', description: 'Hyperoptic Hyperhub', serialNumber: 'S230000000', softwareVersion: 'V5.50(ABVY.4)C0', hardwareVersion: 'V1.0', upTimeSeconds: 923400 }, wan: { connected: true, type: 'IPoE', ipAddress: '100.72.18.4' } };
  if (pathname === '/devices/events') return { events };
  if (pathname === '/devices') return { devices };
  if (pathname.startsWith('/devices/')) return { ok: true };
  if (pathname === '/wlan') return method === 'GET' ? { bands: [{ index: 1, ssid: 'Hyperoptic Fibre 1842', band: '2.4GHz', enabled: true, hidden: false, mainSsid: true, channel: 6, bandwidth: '40MHz', securityMode: 'WPA2/WPA3', pskDisplay: 'ExamplePass123' }, { index: 2, ssid: 'Hyperoptic Fibre 1842', band: '5GHz', enabled: true, hidden: false, mainSsid: true, channel: 44, bandwidth: '80MHz', securityMode: 'WPA2/WPA3', pskDisplay: 'ExamplePass123' }] } : { ok: true };
  if (pathname === '/groups') return { groups: [{ id: 1, name: 'Home', icon: 'other', deviceCount: 2, createdAt: now, updatedAt: now }, { id: 2, name: 'Work', icon: 'laptop', deviceCount: 1, createdAt: now, updatedAt: now }] };
  if (pathname === '/policies') return { policies: [] };
  if (pathname === '/notifications') return { preferences: { newDevices: true, routerOffline: true, backgroundChecks: true, intervalMinutes: 30 } };
  if (pathname === '/diagnostics') return { result: { checkedAt: now, routerLatencyMs: 18, wanConnected: true, checks: [{ key: 'router', label: 'Router', status: 'pass', detail: 'Responded in 18 ms' }, { key: 'wan', label: 'Internet', status: 'pass', detail: 'WAN address is active' }, { key: 'dns', label: 'DNS', status: 'pass', detail: '1.1.1.1, 8.8.8.8' }] } };
  return { ok: true, rules: [], lines: [], config: {}, settings: {}, status: {}, account: {}, remoteManagement: {}, cyberSecure: {}, parentalControls: {} };
}

async function prepare(page, seedSession = true) {
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  if (seedSession) {
    await page.addInitScript(() => {
      sessionStorage.setItem('router-manager-session-v1', JSON.stringify({ serverUrl: location.origin, username: 'admin', password: 'visual-only', fingerprint: '' }));
    });
  }
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseFor(route.request().url(), route.request().method())) });
  });
  return consoleErrors;
}

const browser = await chromium.launch({ headless: true });
const scenarios = [
  { name: 'phone-home-light', viewport: { width: 390, height: 844 }, route: '#/' },
  { name: 'phone-devices-light', viewport: { width: 390, height: 844 }, route: '#/devices' },
  { name: 'phone-activity-dark', viewport: { width: 390, height: 844 }, route: '#/activity', dark: true },
  { name: 'phone-settings-dark', viewport: { width: 390, height: 844 }, route: '#/settings', dark: true },
  { name: 'phone-wifi-light', viewport: { width: 390, height: 844 }, route: '#/settings/wifi' },
  { name: 'tablet-home-light', viewport: { width: 820, height: 1180 }, route: '#/' },
  { name: 'tablet-settings-dark', viewport: { width: 820, height: 1180 }, route: '#/settings', dark: true },
  { name: 'phone-login-light', viewport: { width: 390, height: 844 }, route: '#/login', login: true },
  { name: 'phone-home-reduced-motion', viewport: { width: 390, height: 844 }, route: '#/', reducedMotion: 'reduce' },
];

const report = [];
for (const scenario of scenarios) {
  const context = await browser.newContext({ viewport: scenario.viewport, colorScheme: scenario.dark ? 'dark' : 'light', reducedMotion: scenario.reducedMotion || 'no-preference' });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = await prepare(page, !scenario.login);
  if (scenario.dark) await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto(baseUrl + '/' + (scenario.login ? '' : scenario.route), { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.waitForTimeout(700);
  const target = path.join(outputDir, scenario.name + '.png');
  await page.screenshot({ path: target, fullPage: true });
  const routeAnimation = await page.locator('.route-fade-through').first().evaluate((element) => getComputedStyle(element).animationDuration).catch(() => 'n/a');
  const undersized = await page.locator('nav a, button, input, select, [role=switch]').evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    return visible && (rect.width < 44 || rect.height < 44);
  }).map((element) => ({ tag: element.tagName, label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40), size: [Math.round(element.getBoundingClientRect().width), Math.round(element.getBoundingClientRect().height)] })));
  report.push({ scenario: scenario.name, screenshot: target, consoleErrors: errors, undersized, routeAnimation });
  await context.close();
}
await browser.close();

const failures = report.flatMap((item) => [
  ...item.consoleErrors.map((error) => item.scenario + ': console: ' + error),
  ...item.undersized.map((target) => item.scenario + ': undersized ' + JSON.stringify(target)),
]);
console.log(JSON.stringify({ outputDir, scenarios: report }, null, 2));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('material visual audit passed');

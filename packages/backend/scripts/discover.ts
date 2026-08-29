// Standing regression tool for the reverse-engineered API documented in docs/api-notes.md.
// Re-run this any time the router's firmware may have auto-updated, to catch drift early:
// log any changes you find into api-notes.md's changelog.
import { loadCredentials } from '../src/config/credentials.js';
import { RouterClient } from '../src/router-client/RouterClient.js';
import { RouterUnsupportedFeatureError } from '../src/router-client/errors.js';

// Keep in sync with the OID catalogue table in docs/api-notes.md.
const OIDS = [
  'status', 'wlan', 'lanhosts', 'wps', 'wifi_easy_mesh',
  'nat', 'nat_pcp', 'nat_addr_map', 'nat_trigger',
  'dns', 'dns_route',
  'firewall_acl', 'firewall_proto', 'cyber_secure', 'content_filter',
  'paren_ctl', 'wlan_sch_access', 'scheduler',
  'qos', 'qos_class', 'qos_policer', 'qos_queue', 'qos_shaper',
  'usb_info', 'usb_filesharing',
  'sip_account', 'sip_sp', 'phone',
  'user_account', 'login_privilege',
  'wan', 'ethwanlan', 'wanbackup', 'multiWan',
  'static_dhcp', 'lan', 'ipalias',
  'tr69',
];

const PACE_MS = 150; // don't hammer the router; repeated failed/rapid logins can lock out admin access
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const config = loadCredentials();
  const client = new RouterClient(config);

  console.log(`Logging in to ${config.baseUrl} as ${config.username}...`);
  await client.login();
  console.log('Login OK.\n');

  const results: { oid: string; status: 'ok' | 'unsupported' | 'error'; ms: number; note?: string }[] = [];

  for (const oid of OIDS) {
    const start = Date.now();
    try {
      const data = await client.daoGet(oid);
      const ms = Date.now() - start;
      const objectInfo = Array.isArray((data as any)?.Object)
        ? `Object[${(data as any).Object.length}]`
        : 'Object: n/a';
      results.push({ oid, status: 'ok', ms, note: objectInfo });
      console.log(`✓ ${oid.padEnd(20)} ${ms}ms  ${objectInfo}`);
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof RouterUnsupportedFeatureError) {
        results.push({ oid, status: 'unsupported', ms });
        console.log(`✗ ${oid.padEnd(20)} ${ms}ms  unsupported on this firmware`);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ oid, status: 'error', ms, note: message });
        console.log(`! ${oid.padEnd(20)} ${ms}ms  ERROR: ${message}`);
      }
    }
    await sleep(PACE_MS);
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const unsupported = results.filter((r) => r.status === 'unsupported').length;
  const errored = results.filter((r) => r.status === 'error').length;
  console.log(`\n${ok} ok, ${unsupported} unsupported, ${errored} errored (of ${results.length} probed).`);
  if (errored > 0) {
    console.log('Errors indicate either a genuine network/auth problem, or firmware drift; check against docs/api-notes.md.');
  }
}

main().catch((err) => {
  console.error('Discovery run failed:', err);
  process.exit(1);
});

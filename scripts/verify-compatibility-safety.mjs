import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- 1. Execute the real capability-classification logic (not a text pattern match) ---
// tsx can import the shared package's TypeScript source directly, the same way the
// backend does at runtime (see packages/backend's "dev": "tsx watch ..." script), so this
// exercises the actual code path rather than guessing its behaviour from source text.
const rulesPath = path.resolve('packages/shared/src/capability-rules.ts');
const probe = `
import { classifyRouterSupport, writeStatusFor, compatibilityMessage } from ${JSON.stringify(rulesPath)};
const out = {
  verifiedModel: classifyRouterSupport('EX3301-T0'),
  experimentalModel: classifyRouterSupport('EX3501'),
  unsupportedModel: classifyRouterSupport('Totally Unknown Router 9000'),
  wlanOnVerified: writeStatusFor('wlan', 'verified'),
  wlanOnExperimental: writeStatusFor('wlan', 'experimental'),
  wlanOnUnsupported: writeStatusFor('wlan', 'unsupported'),
  natOnVerified: writeStatusFor('nat', 'verified'),
  qosOnVerified: writeStatusFor('qos', 'verified'),
  wlanSchOnVerified: writeStatusFor('wlan_sch_access', 'verified'),
  sipOnVerified: writeStatusFor('sip_account', 'verified'),
  statusOnVerified: writeStatusFor('status', 'verified'),
  messageIsString: typeof compatibilityMessage('verified') === 'string',
};
console.log(JSON.stringify(out));
`;
const tmpFile = path.join(os.tmpdir(), `verify-compat-${Date.now()}.mts`);
fs.writeFileSync(tmpFile, probe);
let result;
try {
  const run = spawnSync(path.resolve('node_modules/.bin/tsx'), [tmpFile], { encoding: 'utf8', cwd: process.cwd() });
  if (run.status !== 0) throw new Error(`tsx probe failed: ${run.stderr || run.stdout}`);
  const line = run.stdout.trim().split('\n').pop();
  result = JSON.parse(line);
} finally {
  fs.rmSync(tmpFile, { force: true });
}

assert(result.verifiedModel === 'verified', `EX3301-T0 must classify as verified, got ${result.verifiedModel}`);
assert(result.experimentalModel === 'experimental', `EX3501 must classify as experimental, got ${result.experimentalModel}`);
assert(result.unsupportedModel === 'unsupported', `an unrecognised model must classify as unsupported, got ${result.unsupportedModel}`); // negative control
assert(result.wlanOnVerified === 'verified', 'wlan write must be verified only on a verified router');
assert(result.wlanOnExperimental !== 'verified', 'wlan write must NOT be verified on an experimental router');
assert(result.wlanOnUnsupported !== 'verified', 'wlan write must NOT be verified on an unsupported router');
assert(result.natOnVerified !== 'verified', 'port forwarding must stay unverified even on a verified router (write shape unconfirmed)');
assert(result.qosOnVerified !== 'verified', 'QoS must stay unverified even on a verified router (write shape unconfirmed)');
assert(result.wlanSchOnVerified !== 'verified', 'pause/schedule must stay unverified even on a verified router (write shape unconfirmed)');
assert(result.sipOnVerified === 'not-applicable', 'VoIP must be marked not-applicable (deliberately read-only), not merely blocked');
assert(result.statusOnVerified === 'not-applicable', 'router status must be marked not-applicable (read-only info)');
assert(result.messageIsString, 'compatibilityMessage must return a string');

// --- 2. No second copy of the classification logic (the whole point of centralising it) ---
const searchRoots = ['packages/backend/src', 'packages/frontend/src'];
const bannedDeclaration = /\b(function|const)\s+(classifyRouterSupport|writeStatusFor)\b/;
function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (/\.(ts|tsx)$/.test(entry.name)) visit(full);
  }
}
for (const root of searchRoots) {
  walk(root, (file) => {
    assert(!bannedDeclaration.test(read(file)), `${file} redeclares capability-classification logic instead of importing it from @router-manager/shared`);
  });
}

// --- 3. The backend and native path both derive capabilities from the shared rules ---
const detect = read('packages/backend/src/capabilities/detect.ts');
assert(detect.includes("from '@router-manager/shared'") && detect.includes('classifyRouterSupport') && detect.includes('writeStatusFor'), 'backend detect.ts must use the shared classification rules');

const directApi = read('packages/frontend/src/lib/direct-api.ts');
assert(directApi.includes('classifyRouterSupport') && directApi.includes('writeStatusFor'), 'native direct-api.ts must use the shared classification rules');

// --- 4. The UI only ever enables a write when BOTH the feature and the router are verified ---
const capabilitiesContext = read('packages/frontend/src/context/CapabilitiesContext.tsx');
assert(
  /canWrite:\s*\(key\)\s*=>\s*normalize\(key,\s*capabilities\[key\]\)\.write\s*===\s*'verified'\s*&&\s*compatibility\?\.\s*supportLevel\s*===\s*'verified'/.test(capabilitiesContext.replace(/\s+/g, ' ')),
  'canWrite must require both the feature write status and router compatibility to be verified'
);

// --- 5. Every page offering a router write actually gates it behind canWrite ---
const writeGatedPages = {
  'packages/frontend/src/pages/WiFi.tsx': 'wlan',
  'packages/frontend/src/pages/Profiles.tsx': 'wlan_sch_access',
  'packages/frontend/src/pages/PortForwarding.tsx': 'nat',
  'packages/frontend/src/pages/Qos.tsx': 'qos',
  'packages/frontend/src/pages/System.tsx': 'user_account',
};
for (const [file, oid] of Object.entries(writeGatedPages)) {
  const source = read(file);
  assert(source.includes('canWrite') && source.includes(`'${oid}'`), `${file} must gate its write action behind canWrite('${oid}')`);
}

// --- 6. The compatibility banner distinguishes unsupported from experimental ---
const mobileUi = read('packages/frontend/src/components/shared/mobile-ui.tsx');
assert(mobileUi.includes("supportLevel === 'unsupported'") || mobileUi.includes("unsupported ?"), 'CompatibilityBanner must distinguish an unsupported router from an experimental one');

console.log('compatibility safety verification passed');

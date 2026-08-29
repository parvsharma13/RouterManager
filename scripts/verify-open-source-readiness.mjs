import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const readme = fs.readFileSync('README.md', 'utf8');
const ignore = `${fs.readFileSync('.gitignore', 'utf8')}\n${fs.readFileSync('packages/frontend/android/.gitignore', 'utf8')}`;

for (const heading of [
  '## Is my router supported?',
  '## What works today',
  '## Install the app',
  '## Security and privacy',
  '## Architecture',
  '## Known limitations',
  '## Troubleshooting',
  '### Build the APK',
  '### Release signing',
  '### Contributing',
  '## Credits',
]) {
  assert(readme.includes(heading), `README is missing ${heading}`);
}

const disclaimer =
  'Router Manager is an unofficial, open-source Android companion for Hyperoptic Internet customers using compatible Hyperhub routers. It is not affiliated with or endorsed by Hyperoptic, Zyxel, Amazon, or eero.';
assert(readme.includes(disclaimer), 'README is missing the exact unofficial-project disclaimer');

for (const router of ['EX3301', 'EX3501', 'H3600', 'H298A', 'HA‑140W‑B', 'HG2381']) {
  assert(readme.includes(router), `README compatibility table is missing ${router}`);
}
assert(/no computer or backend|not required after installation|is standalone/i.test(readme), 'README must state the Android app does not need the desktop backend');

assert(fs.existsSync('LICENSE'), 'LICENSE is missing');
assert(ignore.includes('keystore.properties'), 'keystore properties must be ignored');
assert(ignore.includes('*.jks'), 'Android keystores must be ignored');
assert(ignore.includes('*.apk'), 'built APKs must be ignored');
assert(!fs.existsSync('packages/frontend/android/app/google-services.json'), 'Google service credentials must not be present');

const sourceRoots = ['packages/backend/src', 'packages/frontend/src', 'packages/shared/src'];
const privateKeyMarker = /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/;
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.(?:ts|tsx|js|mjs|json|md)$/.test(entry.name)) {
      assert(!privateKeyMarker.test(fs.readFileSync(fullPath, 'utf8')), `private key found in ${fullPath}`);
    }
  }
}
for (const root of sourceRoots) walk(root);

// Positive control for the private-key absence check.
assert(privateKeyMarker.test('-----BEGIN PRIVATE KEY-----'), 'private-key negative control failed');

console.log('open source readiness verification passed');

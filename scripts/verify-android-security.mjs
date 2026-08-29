import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const storage = read('packages/frontend/src/lib/auth-storage.ts');
// The encrypted-protocol logic lives in RouterProtocolClient.java (extracted from the
// plugin so DeviceCheckWorker's background job can reuse it without a webview) — check
// both files so this gate tracks wherever the logic actually is, not a specific split.
const plugin =
  read('packages/frontend/android/app/src/main/java/com/parvsharma/routermanager/RouterHttpPlugin.java') +
  read('packages/frontend/android/app/src/main/java/com/parvsharma/routermanager/RouterProtocolClient.java');
const login = read('packages/frontend/src/pages/Login.tsx');
const manifest = read('packages/frontend/android/app/src/main/AndroidManifest.xml');
const network = read('packages/frontend/android/app/src/main/res/xml/network_security_config.xml');
const extraction = read('packages/frontend/android/app/src/main/res/xml/data_extraction_rules.xml');

assert(storage.includes("Capacitor.isNativePlatform()"), 'native storage must be platform-aware');
assert(storage.includes('SecureStorage.setItem'), 'native sessions must use secure storage');
assert(storage.includes('fingerprint'), 'router certificate fingerprint must be persisted');
assert(plugin.includes('isPrivate(url.getHost())'), 'self-signed transport must be private-network scoped');
assert(plugin.includes('SHA-256') && plugin.includes('security certificate changed'), 'certificate pinning is required');
assert(plugin.includes('AES/CBC/PKCS5Padding') && plugin.includes('RSA/ECB/PKCS1Padding'), 'router encryption is required');
assert(login.includes('autoComplete="current-password"'), 'login must support password managers');
assert(login.includes('<h1'), 'login must expose a top-level heading');
assert(!/onPaste|preventDefault\(\).*paste/i.test(login), 'login must not block password paste');
assert(manifest.includes('android:allowBackup="false"'), 'Android backup must be disabled');
assert(manifest.includes('android.permission.INTERNET'), 'Android INTERNET permission is required');
assert(manifest.includes('android:usesCleartextTraffic="false"'), 'cleartext traffic must be disabled');
assert(network.includes('cleartextTrafficPermitted="false"'), 'network policy must reject HTTP');
assert(extraction.includes('<exclude domain="sharedpref"'), 'credential preferences must be excluded from transfer');

console.log('android security verification passed');

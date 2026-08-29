import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const apk = 'RouterManager-v1.0.apk';
const sdk = process.env.ANDROID_HOME || '/opt/homebrew/share/android-commandlinetools';
const buildTools = `${sdk}/build-tools/36.0.0`;
const javaHome = process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, JAVA_HOME: javaHome },
  });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return `${result.stdout}${result.stderr}`;
}

if (!fs.existsSync(apk)) throw new Error(`Missing ${apk}`);
if (fs.statSync(apk).size < 1_000_000) throw new Error('APK is unexpectedly small');

const signature = run(`${buildTools}/apksigner`, ['verify', '--verbose', '--print-certs', apk]);
if (!signature.includes('Verifies')) throw new Error('APK signature verification failed');
if (!signature.includes('Number of signers: 1')) throw new Error('Expected one APK signer');
if (!signature.includes('Signer #1 key size (bits): 3072')) throw new Error('Expected 3072-bit signing key');

const badging = run(`${buildTools}/aapt`, ['dump', 'badging', apk]);
if (!badging.includes("name='com.parvsharma.routermanager'")) throw new Error('Unexpected application id');
if (!badging.includes("application-label:'Router Manager'")) throw new Error('Unexpected application label');
if (!badging.includes("targetSdkVersion:'36'")) throw new Error('Unexpected Android target SDK');
if (!badging.includes("uses-permission: name='android.permission.INTERNET'")) throw new Error('Missing internet permission');

console.log('apk verification passed');

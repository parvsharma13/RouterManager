import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const javaHome = process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
const androidHome = process.env.ANDROID_HOME || '/opt/homebrew/share/android-commandlinetools';
const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: androidHome };

function run(command, args, label) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status})`);
}

// 1. Build and sign the release APK. Requires packages/frontend/android/keystore.properties
// to already point at a real keystore. See README.md's "Release signing" section.
run('npm', ['run', 'android:release'], 'Build signed release APK');

// 2. Publish it to the path the README tells users to install from.
const builtApk = 'packages/frontend/android/app/build/outputs/apk/release/app-release.apk';
const publishedApk = 'RouterManager-v1.1.1.apk';
if (!fs.existsSync(builtApk)) throw new Error(`Expected release APK at ${builtApk} after a successful build`);
fs.mkdirSync(path.dirname(publishedApk), { recursive: true });
fs.copyFileSync(builtApk, publishedApk);
console.log(`\nCopied ${builtApk} -> ${publishedApk}`);

// 3. Re-run every existing Android gate against the freshly built artifact: standalone
// boundary, native security posture, protocol markers, and the signed APK itself.
run('node', ['scripts/verify-standalone-android.mjs'], 'Verify standalone boundary');
run('node', ['scripts/verify-android-security.mjs'], 'Verify native security posture');
run('node', ['scripts/verify-direct-router-protocol.mjs'], 'Verify protocol markers');
run('node', ['scripts/verify-apk.mjs'], 'Verify signed APK');

console.log('\nandroid release verification passed');

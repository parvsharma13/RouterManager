import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const apk = 'packages/frontend/android/app/build/outputs/apk/release/app-release.apk';
if (!fs.existsSync(apk)) throw new Error('Build the release APK first.');
const extracted = spawnSync('unzip', ['-p', apk], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const content = `${fs.readFileSync('packages/frontend/src/lib/direct-api.ts','utf8')}\n${extracted.stdout}`;
if (content.includes(':4001')) throw new Error('APK still references desktop port 4001.');
if (!content.includes('RouterHttp')) throw new Error('Native direct-router bridge is missing.');
console.log('standalone android verification passed');

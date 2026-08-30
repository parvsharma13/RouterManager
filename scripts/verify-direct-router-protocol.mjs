import crypto from 'node:crypto';
import fs from 'node:fs';
// Protocol markers live in RouterProtocolClient.java (extracted from the plugin so
// DeviceCheckWorker's background job can reuse the same login/DAL logic without a webview).
const source =
  fs.readFileSync('packages/frontend/android/app/src/main/java/com/parvsharma/routermanager/RouterHttpPlugin.java','utf8') +
  fs.readFileSync('packages/frontend/android/app/src/main/java/com/parvsharma/routermanager/RouterProtocolClient.java','utf8');
for (const marker of ['/getRSAPublickKey','/UserLogin','/cgi-bin/DAL?oid=','CSRFToken','AES/CBC/PKCS5Padding','RSA/ECB/PKCS1Padding']) {
  if (!source.includes(marker)) throw new Error(`Missing protocol marker: ${marker}`);
}
if (source.includes('DalGetOneObject=y&oid=')) {
  throw new Error('Full-OID reads must not use DalGetOneObject without an instance selector');
}
const key=Buffer.alloc(32,7),iv=Buffer.alloc(32,9),clear='{"protocol":"zyxel-dal"}';
const cipher=crypto.createCipheriv('aes-256-cbc',key,iv.subarray(0,16));
const encrypted=Buffer.concat([cipher.update(clear),cipher.final()]);
const decipher=crypto.createDecipheriv('aes-256-cbc',key,iv.subarray(0,16));
if(Buffer.concat([decipher.update(encrypted),decipher.final()]).toString()!==clear)throw new Error('AES-CBC vector failed');
console.log('direct router protocol verification passed');

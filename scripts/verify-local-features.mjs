import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function exists(file) {
  return fs.existsSync(file);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Local persistence: native SQLite with a migration from the legacy JSON blob ---
const localData = read('packages/frontend/src/lib/local-data.ts');
for (const table of ['overlays', 'seen_devices', 'profiles', 'policies', 'events', 'diagnostics', 'settings']) {
  assert(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`).test(localData), `local-data.ts must create a ${table} table`);
}
assert(localData.includes('migrateLegacy'), 'local-data.ts must migrate the pre-SQLite JSON blob');
assert(localData.includes('setEncryptionSecret') || localData.includes('isSecretStored'), 'the native SQLite database must be encrypted');
assert(localData.includes('LEGACY_KEY') && localData.includes("SecureStorage.removeItem(LEGACY_KEY)"), 'a successful migration must clean up the legacy key');

// --- Activity events: backend insert path + the extended event-type set ---
const eventStore = read('packages/backend/src/store/eventStore.ts');
assert(eventStore.includes('export function recordEvent'), 'backend eventStore.ts must expose an insert path, not just reads');
const dbSchema = read('packages/backend/src/store/db.ts');
assert(/device_events[\s\S]{0,300}detail TEXT/.test(dbSchema), 'device_events table must carry a detail column');

const appDataTypes = read('packages/shared/src/types/app-data.ts');
for (const eventType of ['device_online', 'device_offline', 'router_online', 'router_offline', 'settings_changed', 'reboot_requested', 'certificate_changed', 'diagnostic_result']) {
  assert(appDataTypes.includes(`'${eventType}'`), `DeviceEvent must include the '${eventType}' event type`);
}
assert(read('packages/backend/src/store/deviceStore.ts').includes("eventType: active ? 'device_online' : 'device_offline'"), 'markSeen must record online/offline transitions, not just first-seen');

// --- Diagnostics: a real backend route wired to the router, plus notification prefs ---
const routesIndex = read('packages/backend/src/routes/index.ts');
assert(routesIndex.includes('diagnosticsRoutes') && routesIndex.includes('notificationsRoutes'), 'diagnostics and notifications routes must be registered');
assert(exists('packages/backend/src/services/diagnosticsService.ts'), 'diagnosticsService.ts must exist');
assert(exists('packages/backend/src/store/notificationStore.ts'), 'notificationStore.ts must exist');

const apiClient = read('packages/frontend/src/lib/api-client.ts');
assert(apiClient.includes('diagnostics:') && apiClient.includes("'/diagnostics'"), 'api-client must expose diagnostics.run()');
assert(apiClient.includes('notifications:') && apiClient.includes("'/notifications'"), 'api-client must expose notifications.get()/update()');

const directApi = read('packages/frontend/src/lib/direct-api.ts');
assert(directApi.includes('diagnostics:') && directApi.includes('checks:'), 'native direct-api.ts must implement diagnostics.run() locally, not just proxy a backend');
assert(directApi.includes('notifications:') && directApi.includes('setNotificationPrefs'), 'native direct-api.ts must implement notifications.update() and mirror it natively');

// --- Native background checks: WorkManager job, permission handling, no webview dependency ---
const androidSrc = 'packages/frontend/android/app/src/main/java/com/parvsharma/routermanager';
for (const file of ['AppPrefs.java', 'AppPrefsPlugin.java', 'DeviceCheckWorker.java', 'DeviceCheckScheduler.java', 'SecureCredentialReader.java']) {
  assert(exists(`${androidSrc}/${file}`), `${file} must exist for background device checks`);
}
const worker = read(`${androidSrc}/DeviceCheckWorker.java`);
assert(worker.includes('extends Worker'), 'DeviceCheckWorker must be a real androidx.work.Worker');
assert(worker.includes('SecureCredentialReader.read') && !worker.includes('PluginCall'), 'the background worker must read credentials without a webview/plugin bridge');
assert(worker.includes('NotificationCompat') || worker.includes('NotificationManagerCompat'), 'the worker must be able to raise a real Android notification');

const mainActivity = read(`${androidSrc}/MainActivity.java`);
assert(mainActivity.includes('AppPrefsPlugin.class'), 'MainActivity must register AppPrefsPlugin');

const manifest = read('packages/frontend/android/app/src/main/AndroidManifest.xml');
assert(manifest.includes('android.permission.POST_NOTIFICATIONS'), 'AndroidManifest.xml must declare the notification permission');

const appGradle = read('packages/frontend/android/app/build.gradle');
assert(/androidx\.work:work-runtime/.test(appGradle), 'app/build.gradle must depend on androidx.work (WorkManager)');

const notificationsPage = read('packages/frontend/src/pages/Notifications.tsx');
assert(notificationsPage.includes('requestNotificationPermission'), 'Notifications settings page must request the Android notification permission before enabling background checks');

console.log('local features verification passed');

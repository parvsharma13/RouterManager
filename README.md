# Router Manager

![Platform](https://img.shields.io/badge/platform-Android-3DDC84)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-unofficial-orange)
![Router support](https://img.shields.io/badge/Zyxel%20EX3301--T0-verified-brightgreen)

Router Manager is an unofficial, open-source Android companion for Hyperoptic Internet customers using compatible Hyperhub routers. It is not affiliated with or endorsed by Hyperoptic, Zyxel, Amazon, or eero.

**[Download Router Manager v1.1](https://github.com/parvsharma13/RouterManager/raw/main/RouterManager-v1.1.apk)**

Version 1.1 introduces the refreshed Material Design interface, responsive phone and tablet navigation, light and dark themes, accessible motion, Android edge-to-edge presentation, predictive-back support, and router compatibility fixes.

It replaces the stock Zyxel admin GUI with a mobile-first, four-tab app (Home, Devices, Activity, Settings) that adds what the router itself doesn't provide: per-device nicknames and icons, household Profiles for pausing or scheduling internet access, Wi-Fi QR sharing, new-device alerts, and network diagnostics. Everything runs locally, with no account, no cloud relay, and no telemetry.

There's no official API for this router. Every request shape below was reverse-engineered from the router's own web app and confirmed live against a real device. See [`docs/api-notes.md`](docs/api-notes.md) for the full write-up, and the independent [ZyxelAES](https://github.com/lorenzodifuccia/ZyxelAES) project for corroborating research on the same RSA/AES protocol family.

## Is my router supported?

| Hyperoptic router | Status |
|---|---|
| Zyxel EX3301‑T0 | **Verified and supported** |
| Zyxel EX3501 / EX3500‑T0 family | Unverified; experimental read-only access only if capability detection succeeds |
| ZTE H3600 | Not supported |
| ZTE H298A / H298N | Not supported |
| Nokia HA‑140W‑B | Not supported |
| Tilgin HG2381 | Not supported |
| Other routers | Unsupported until an adapter and live verification are contributed |

The app checks your router's reported model and firmware on every login (Settings › About & compatibility) and only enables writes where that exact combination has been verified. An unverified or unsupported router never gets a silent guess; it gets a plain "this hasn't been confirmed safe" explanation instead.

## What works today

| Feature | Status |
|---|---|
| Network status, router health, uptime, Wi-Fi summary | Available |
| Searchable device list, filters, device detail, nicknames/icons/notes | Available (app-owned, stored on this phone) |
| Household Profiles (grouping devices) | Available (app-owned) |
| Activity timeline (new devices, router state, settings changes) | Available |
| Wi-Fi name/password editing, QR sharing | Available on the verified EX3301‑T0; read-only elsewhere |
| New-device / router-offline notifications | Available (opt-in, Android WorkManager, no location permission) |
| Network diagnostics (router reachability, WAN, DNS) | Available |
| Light / dark / system theme | Available |

| Feature | Status |
|---|---|
| Profile pause / scheduled offline windows | Experimental. Saved locally, but the router hasn't confirmed the write yet, so the app tells you plainly when a pause isn't actually enforced |
| Port forwarding, Dynamic DNS | Read/experimental, write shape not yet confirmed live |
| Firewall rules, security preset, parental controls | Read-only |
| Quality of service | Read/experimental, write shape not yet confirmed live |
| VoIP status, USB status | Read-only (ISP-provisioned or router-managed) |

| Planned (needs live router verification first) | |
|---|---|
| Reliable pause/schedule enforcement | Guest Wi-Fi, isolation, expiry, QR sharing |
| Static DHCP reservations | Per-device QoS / temporary priority |
| Content filtering, SafeSearch | Block/allow lists for unrecognised devices |
| Data usage (if the router exposes suitable counters) | Mesh/extender topology |
| Phone-to-internet speed test history | WPS as a time-limited, warned action |
| Router logs / exportable diagnostics | |

Explicitly out of scope: cloud accounts, remote relay servers, subscriptions, telemetry, remote management, automatic firmware installation, and TR-069 configuration changes.

## Install the app

The Android app is standalone. It talks directly to your Zyxel router over your home Wi-Fi using the router's encrypted RSA/AES login and DAL protocol. Your computer, a backend server, and internet access are not required after installation.

1. Download [`RouterManager-v1.1.apk`](https://github.com/parvsharma13/RouterManager/raw/main/RouterManager-v1.1.apk) directly to your Android phone (or copy it over from your computer).
2. Open it and allow installation from that file-manager app when prompted.
3. Connect the phone to your router's Wi-Fi.
4. Enter the router address (normally `https://192.168.1.1`) and the router admin username and password.

The first successful connection records the router's certificate fingerprint. A later unexpected certificate change is blocked to protect the login.

## Security and privacy

- Router address, username, password, and pinned certificate fingerprint are stored using Android Keystore-backed secure storage. Credentials are never embedded in the APK or committed to source control.
- Device history, Profiles, activity, diagnostics, and app settings live in an encrypted on-device SQLite database (via [`capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite)). Nothing leaves your phone.
- The app permits only HTTPS and restricts its self-signed router connection to loopback, link-local, or private-network addresses.
- The app trusts the first router certificate it sees (TOFU) and blocks unexpected fingerprint changes on later connections.
- Android app backups and device-transfer extraction are disabled for app data.
- Background device/router checks (opt-in, Settings › Notifications) run on a schedule via Android WorkManager and attempt the configured private router address directly. The app never requests location permission to identify a Wi-Fi network.
- Release keystores and signing properties are gitignored. `docs/discovery-log/`, `.router-config.json`, and any `.har`/`cookies.txt` files are gitignored too; don't remove those entries, they can contain secrets.

## Architecture

- **`packages/shared`**: TypeScript types and the capability-classification rules (`capability-rules.ts`) shared between the backend and the frontend, so both sides of the app agree on what's verified, experimental, or blocked for a given router.
- **`packages/backend`**: an Express server used for local development and browser testing (`npm run dev`). It is *not* part of the shipped Android app. `src/router-client/RouterClient.ts` holds the one authenticated router session; `src/capabilities/detect.ts` probes the router's identity and every known feature OID to build the capability report described above.
- **`packages/frontend`**: the Vite + React interface and the standalone Android project.
  - On the web (dev mode), the frontend calls the backend's `/api/*` routes.
  - On Android, `packages/frontend/src/lib/direct-api.ts` talks to the router directly through a native Capacitor plugin, with no backend involved at all.
  - `RouterProtocolClient.java` implements the encrypted RSA/AES login and DAL protocol once, natively. `RouterHttpPlugin.java` exposes it to the webview, and `DeviceCheckWorker.java` (a WorkManager job) reuses the same client to run background checks with no webview or JS runtime available.
  - `FeatureGate` hides a page's content with a plain "not available on this router" message when the capability report says a feature isn't exposed, instead of rendering a broken form.

### The encrypted Zyxel protocol, briefly

Login exchanges an RSA-encrypted AES key, then every subsequent request/response body is AES-256-CBC encrypted with that session key. See [`docs/api-notes.md`](docs/api-notes.md) for the full request/response shapes, the OID catalogue, and known quirks (the misspelled `/getRSAPublickKey` path, the cookie name, the half-used 32-byte IV, and more). `packages/backend/scripts/discover.ts` is a runnable regression check against a live router; re-run it after a firmware update to catch protocol drift.

## Known limitations

- Read paths for `status`, `wlan`, and `lanhosts` (Home, Wi-Fi, Devices) and the Wi-Fi write path are confirmed live against real hardware. Every other write (port forwarding, DDNS, QoS, scheduled pauses) is a best-effort guess pending live confirmation, and stays disabled in the UI until proven. See each endpoint module in `packages/backend/src/router-client/endpoints/` for its specific confidence note.
- VoIP (`sip_account`) and remote management (`tr69`) are deliberately read-only. Both are provisioned by your ISP.
- Only the Zyxel EX3301‑T0 is verified. Other models in the same family are treated as experimental (read-only) even though they answer the same protocol; anything else is unsupported.
- No mesh/extender topology, guest network management, or content filtering yet. See the planned table above.

## Troubleshooting

- **"Unsupported router" on login**: the encrypted protocol handshake or the router identity check failed. Confirm you're using the Zyxel Hyperhub's own address (usually `https://192.168.1.1`), not a different device.
- **"The router security certificate changed"**: expected if you reset or replaced your router; only reconnect if you did this yourself. If you didn't, disconnect and investigate before continuing.
- **Writes are greyed out**: check Settings › About & compatibility. Most writes besides Wi-Fi are experimental until verified live; see the feature tables above.
- **New-device notifications never arrive**: confirm Android notification permission is granted and background checks are enabled in Settings › Notifications; the check only succeeds while your phone can reach the router's private address.
- **Router unreachable after a firmware update**: run `npm run discover -w packages/backend` (see below) to see which OIDs still respond, and open an issue with the output.

## For contributors

```bash
npm install
npm run setup:credentials   # stores the admin password in macOS Keychain, run this once
npm run dev                 # starts backend (:4001) + frontend (:5173), for browser-based development only
```

Open http://localhost:5173. This local backend+browser setup exists purely to develop and test against a real router from a computer; it is never required to use the shipped Android app.

`npm run setup:credentials` prompts for the router's base URL, admin username, and admin password. The password is stored **only** in macOS Keychain (service `RouterManager`, account `router-admin`) and is never written to a file. If you'd rather use a `.env` file instead (less secure, plaintext on disk), copy `.env.example` to `.env` and fill in `ROUTER_ADMIN_PASSWORD`; the keychain is checked first either way.

### Verifying it's talking to your router

```bash
npm run discover -w packages/backend
```

Logs in and probes every known OID, printing ok/unsupported/error per feature. Re-run this after a firmware update to catch drift; see the changelog section at the bottom of `docs/api-notes.md`.

### Build the APK

Prerequisites: Node.js 20+, Java 21, Android SDK platform 36, and build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_HOME`, then run:

```bash
npm install
npm run android:debug     # signed debug APK for development
npm run android:release   # release APK; signing setup below is required
```

Capacitor treats `packages/frontend/android/` as source code. After changing web dependencies or native plugins, `npm run android:release` rebuilds the web app and synchronizes native dependencies before Gradle runs.

### Release signing

Never commit signing keys. Create a keystore outside the repository, then add an ignored `packages/frontend/android/keystore.properties`:

```properties
storeFile=/absolute/path/to/router-manager-release.jks
storePassword=your-secret-store-password
keyAlias=router-manager
keyPassword=your-secret-key-password
```

Back up the keystore and passwords securely. Android updates must be signed by the same key; losing it means existing installations cannot be upgraded in place.

### Verification scripts

`scripts/` contains the checks that gate a release: standalone-android boundaries, protocol markers, native security posture, compatibility-safety enforcement, mobile IA/accessibility, local-feature completeness, and open-source readiness. Run them (or `npm run verify:android`) before submitting a change that touches the Android project or the capability model.

### Contributing

Issues and pull requests are welcome. Run `npm run lint`, `npm run build`, and the verification scripts before submitting changes. Never include router captures, credentials, `.env` files, SQLite data, signing keys, or generated APKs in a pull request. This project is available under the [MIT License](LICENSE).

## Credits

- Protocol research: this repo's own [`docs/api-notes.md`](docs/api-notes.md), confirmed live against a real Zyxel EX3301‑T0, and corroborated by the independent [ZyxelAES](https://github.com/lorenzodifuccia/ZyxelAES) project.
- Design language inspired by the information architecture of eero and TP-Link Deco's mobile apps. No branding, copy, or layouts copied.

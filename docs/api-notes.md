# Zyxel EX3301-T0 Web API — Reverse-Engineering Notes

Confirmed live against the actual device on 2026-08-25. Firmware: `V5.50(ABVY.5.5)b6_Y0`, architecture `OPAL_2.0`, model `EX3301-T0` (Hyperoptic-branded "Hyperhub").

No official public API docs exist for this device. Everything below was derived by downloading the router's own web app bundle (`/static/js/app.js`, a Vue app) and reading its `httpReqSendAndRecv` HTTP helper (in `/static/js/zyxel.js`) and login-encryption logic, then confirming every step against the live device at `192.168.1.1`. `RouterClient` is implemented directly against this document — see `packages/backend/scripts/discover.ts` for the runnable proof/regression version of everything here.

## Base URL

`https://192.168.1.1` — the device advertises `HTTP_Redirect_HTTPS: true` and serves on port 443 with a self-signed cert (plain `http://` also responds but redirects). Use HTTPS with `rejectUnauthorized: false` scoped to a dedicated agent for this client only.

## Login flow

1. **`GET /getRSAPublickKey`** (yes, "Publick" — that's the real, misspelled path) → `{ "RSAPublicKey": "-----BEGIN PUBLIC KEY-----\n...", "result": "ZCFG_SUCCESS" }`. A fresh 2048-bit RSA public key, PEM format.
2. Optionally `GET /GetInfoNoLogin` → device/branding info pre-login (`ModelName`, `LogoFilename`, etc.) — not required for login, just what the login page itself displays.
3. Build the login payload as plain JSON:
   ```json
   {
     "Input_Account": "admin",
     "Input_Passwd": "<base64 of the plaintext password>",
     "currLang": "en",
     "RememberPassword": 0,
     "SHA512_password": ""
   }
   ```
   `Input_Passwd` is only base64, not hashed — `SHA512_password` can be sent as an empty string; the real protection is the transport encryption below.
4. Generate two independent random 32-byte buffers: `aesKey` (used directly as an AES-256 key) and `ivFull` (only its **first 16 bytes** are used as the actual AES-CBC IV — the extra 16 bytes are generated and transmitted but not used by the cipher; this matches the CryptoJS `WordArray.random(32)` call in the original code, which only reads the first block-size's worth of words as IV).
5. AES-256-CBC + PKCS7 encrypt the JSON payload string with `aesKey` / `ivFull.slice(0,16)` → `ciphertext`.
6. RSA-PKCS1v1.5 encrypt the **base64 string form of `aesKey`** (not its raw bytes) with the fetched public key → `encryptedKey`.
7. **`POST /UserLogin`** with body:
   ```json
   { "content": "<base64 ciphertext>", "iv": "<base64 of the full 32-byte ivFull>", "key": "<base64 RSA-encrypted aesKey-string>" }
   ```
8. Response is `200` with `{ "content": "...", "iv": "..." }` (also AES-encrypted, using the *same* `aesKey` and the IV **from this response**, not the one you sent). Decrypt it the same way (AES-256-CBC, first 16 bytes of the response's own `iv`) to get:
   ```json
   { "sessionkey": "...", "ThemeColor": "", "changePw": false, "showSkipBtn": false, "loginAccount": "admin", "loginLevel": "medium", "result": "ZCFG_SUCCESS" }
   ```
9. The `Set-Cookie` response header sets the real session cookie — observed name **`Session`** (not `Authentication`; that name only appears in an old/generic `deleteCookie()` helper that doesn't reflect this firmware's actual cookie). `HttpOnly; SameSite=Strict`. Keep it in a cookie jar and send it back on every subsequent request.
10. `sessionkey` from the decrypted body is sent as the `CSRFToken` header on every subsequent `/cgi-bin/*` request (not part of the cookie).
11. Keep `aesKey` in memory for the lifetime of the session — every later `/cgi-bin/*` call reuses this *same* key with a fresh random IV per request (no RSA involved after login).

Session lifetime: not yet measured precisely; treat as short (Zyxel OPAL-trunk devices typically run ~10 min idle timeout) — `RouterClient` should re-login proactively and also transparently retry once on an auth-failure response.

## Reading config: `/cgi-bin/DAL`

**`GET /cgi-bin/DAL?DalGetOneObject=y&oid=<name>`**, headers `Cookie: <session cookie>`, `CSRFToken: <sessionkey>`.

Response is always `{ "content": "...", "iv": "..." }`, AES-decrypt with the session's `aesKey` and the response's own `iv` (first 16 bytes) to get the real payload:
```json
{ "result": "ZCFG_SUCCESS", "ReplyMsg": "...", "Object": [ { ...fields... } ] }
```
`Object` is an array — empty when the feature has no configured entries yet (e.g. no port-forward rules), otherwise one element per instance (WiFi has one element per band/SSID, `sip_account` has one per FXS line, etc).

## Writing config

Same `/cgi-bin/DAL?oid=<name>` URL, `action: "POST"` or `"PUT"` (both observed depending on feature — the app code varies it per page), request body is the **plaintext JSON object** (not query-string encoded) AES-encrypted the same way as login step 5 (fresh random IV per request, reusing the session's `aesKey`, no RSA step) and sent as `{ "content": ..., "iv": ... }`. Not yet confirmed field-by-field for every OID — confirm each one's exact write shape (PUT vs POST, full-object-replace vs delta) live before wiring up its route, using `discover.ts` as a sandbox. Do this deliberately and one feature at a time (see build order in the plan) — don't guess and fire writes blind.

## Confirmed OID catalogue

Every OID below returned `HTTP 200` / `result: "ZCFG_SUCCESS"` when probed live (`packages/backend/scripts/discover.ts` reproduces this). "✓ shape seen" means we've inspected real field names from this device; others are confirmed *reachable* but not yet shape-mapped — do that at implementation time for whichever page you're building.

| OID | Feature area | Notes |
|---|---|---|
| `status` | Dashboard | ✓ shape seen. `DeviceInfo.{Manufacturer, ModelName, SerialNumber, SoftwareVersion, UpTime, ...}` plus WAN/PPP status. |
| `wlan` | WiFi | ✓ shape seen. One element per band/SSID: `SSID, wlEnable, band, channel, bandwidth, SecurityMode, PskDisplay, AutoGenPSKValue, MainSSID, wlHide, ...`. `PskDisplay` is the live plaintext PSK — treat as a secret in the UI (masked by default). |
| `lanhosts` | Devices | ✓ shape seen. `wanInfo` + `lanhosts[]`: `HostName, IPAddress, PhysAddress (MAC), InterfaceType, X_ZYXEL_ConnectionType, X_ZYXEL_SignalStrength, Active, ...`. |
| `nat` | Port forwarding | Reachable, empty (no rules configured). Sibling OIDs: `nat_pcp`, `nat_addr_map`, `nat_trigger`. |
| `dns` | DDNS | Reachable, empty. This is also where DDNS provider/hostname/username/password live (`ddnsUsername`/`ddnsPassword` field names seen referenced in app.js) — DDNS is a sub-section of `dns`, not a separate OID. Sibling: `dns_route` (static DNS routing, unrelated to DDNS). |
| `firewall_acl` | Firewall rules | Reachable, empty. Sibling: `firewall_proto`. |
| `cyber_secure` | Firewall preset/level | Reachable, empty — likely a security-level toggle rather than a rule list; confirm shape once populated or by toggling in the stock GUI once and re-reading. |
| `content_filter` | URL/content filtering | Reachable, empty. |
| `paren_ctl` | Parental controls | ✓ shape seen (partial): `PrentalCtlEnable, MaxLenPrentalCtlPrf`. Sibling: `wlan_sch_access`, `scheduler` (time-based access schedules) — both confirmed reachable live (`result: ZCFG_SUCCESS`) but `Object: []` (no entries configured), so no field names revealed yet. `scheduler`'s `ReplyMsg` came back `"Type"` and `paren_ctl`'s `"Id"` (normally empty on a clean read) — a possible hint about a missing/expected field, not confirmed. App-level pause/schedule policies (`packages/backend/src/router-client/endpoints/accessControl.ts`) attempt a write to `wlan_sch_access` — **write payload is a best-effort guess pending live confirmation.** `GET /api/policies/raw` returns the raw passthrough for all three OIDs — inspect it live after attempting a write and correct `accessControl.ts`'s payload once the real field names are known. |
| `qos` | QoS | ✓ shape seen: `Enable, UpRate, DownRate, MinUpRate, MaxUpRate, AutoMapType`. Siblings: `qos_class`, `qos_policer`, `qos_queue`, `qos_shaper`. |
| `usb_info` | USB status | ✓ shape seen: `Account, Samba, "Service Conf", "Usb Info"` (note the literal space-containing keys). Sibling: `usb_filesharing`. |
| `sip_account` | VoIP status | ✓ shape seen, 2 entries (matches the 2 FXS ports): `DirectoryNumber, Enable, Status, AuthUserName, AuthPassword, ...`. Treat as **read-only** in the app — this is almost certainly provisioned by Hyperoptic; don't build write support without explicit need. Siblings: `sip_sp`, `phone`. |
| `user_account` | Admin account | ✓ shape seen: `Username, group, Enabled, RemoteAccessPrivilege, AccountIdleTime, ...` — no password field in the GET response (write-only, good practice). Password change likely goes through the separate `/cgi-bin/PasswordReset` endpoint (seen as a literal route in app.js), not this OID — confirm before implementing. |
| `wan` | WAN config | ✓ shape seen: `Type, Mode, IPAddress, GatewayIPAddress, DNSServer, VLANID, NatEnable, ...`. Siblings: `ethwanlan`, `wanbackup`, `multiWan`. |
| `lan` | LAN/DHCP server | ✓ shape seen: `EnableDHCP, DHCP_MinAddress, DHCP_MaxAddress, DHCP_LeaseTime, IPAddress, SubnetMask, IPv6_*`. |
| `static_dhcp` | DHCP reservations | Reachable, empty (no reservations configured). |
| `ipalias` | LAN IP aliases | Reachable. |
| `tr69` | Remote management (TR-069/CWMP) | ✓ shape seen: `EnableCWMP, URL, Username, Password, ConnectionRequestURL, ...`. This is Hyperoptic's ACS config — **display read-only only**, do not build write/toggle support (changing it could break the ISP's ability to manage/support the device, or vice versa lock them out). |
| `wps` | WiFi Protected Setup | ✓ shape seen, 2 entries (per band): `Enable, ModeEnabled, X_ZYXEL_WPS_DevicePin, ...`. |
| `wifi_easy_mesh` | MPro Mesh | Reachable, not yet shape-mapped. |

Additional OIDs seen referenced in the app bundle but not yet probed live (lower priority for v1, mostly VPN/cellular/advanced-routing features this device likely doesn't use): `IPSecVPN`, `VPNLite`, `vpnclient`, `gre_tunnel`, `policy_route`, `static_route`, `intf_group`, `vlan_group`, `port_mirror`, `cellwan_*` (this is a fibre gateway, not cellular — expect these to be unsupported/empty), `ExtenderNetMAP`, `OperatingModes`/`OperationMode`, `email_ntfy`, `dev_sec_cert`, `sp_mgmt_srv`, `sp_trust_domain`, `trust_domain`, `login_privilege`, `RDM_OID_ETH_LINK`, `RDM_OID_PPP_IFACE`, `RDM_OID_ZY_SAMBA_DIR`, `ttsamba_account`, `pppoe_setting`, `quickWanSet`, `DMGeneric`, `LanPortInfo`, `ethctl`. `capabilities/detect.ts` should probe these too and simply mark them unsupported/hidden if they 404 or error on this device.

## Non-DAL utility endpoints (literal `/cgi-bin/*` routes, not OID-based)

Seen as plain strings in app.js, separate from the DAL system: `CardInfo`, `CheckSfpLinkUp`, `CheckVoipInuse`, `CurrentTime`, `GetRouterLanPortMacList`, `LAN_PORT_LIST_Get`, `LEDStatus`, `MULTI_USER_LIST_Get`, `MenuList`, `MultiLangSave`, `Online_FWUpgradeAction` (firmware upgrade), `PasswordReset`, `QuickStartFinish`/`QuickStartInternet`/`QuickStartTimeZone`, `Reboot`, `SteeringStatus_handle`, `UserLoginCheck` (session-still-valid probe), `UserLogout`, `WAN_LAN_LIST_Get`, `getBasicInformation`, `getCustomizationData`, `getDefaultWANIP`, `getWebGuiFlag`, `loginAccountLevel`, `voiceDebug`. `Reboot` and `PasswordReset` are the obvious System-page targets; confirm their exact request shape live before wiring (same AES-encrypted-body convention as DAL writes, since they're POSTed to `/cgi-bin/*`).

## Quirks / gotchas

- **GET requests are not request-body-encrypted** (query string only — `DalGetOneObject=y&oid=...`), but **responses always are**, whenever the URL is `/UserLogin` or contains `/cgi-bin/`. Don't assume an unencrypted response shape for GETs.
- The 32-byte `iv` field sent/received is **not** used whole — only its first 16 bytes are the real AES-CBC IV. Send the full 32 bytes (matching what the server expects to receive), but only use the first 16 for your own AES calls.
- RSA-encrypt the AES key's **base64 string representation**, not its raw bytes.
- Session cookie name is `Session`, not `Authentication` (the latter is dead code from an older shared helper file, `zyxel.js`, that doesn't match this firmware's actual behavior — a reminder that static analysis alone isn't enough; always confirm live).
- Pace requests during discovery/regression runs (a short delay between calls) — repeated failed logins can lock out router admin access.

## Changelog

- **2026-08-25** — Initial discovery. Full login/session/DAL-GET pipeline implemented and confirmed working end-to-end against the live device (`status`, `wlan`, `lanhosts` fully read; every OID in the catalogue above probed reachable). Write shapes not yet confirmed for any OID — confirm per-feature at implementation time.
- **2026-08-25** — Added app-owned device management (nicknames/icons/groups, local SQLite, not a router feature at all) and pause/schedule policies. Policies attempt native enforcement via `wlan_sch_access` (see the `paren_ctl` row above) — this is the first write in the app attempted *without* first decompiling the app.js bundle to confirm the GET shape (only a live probe against the real device). **Tested both PUT and POST live against a dummy MAC** — both returned `ZCFG_SUCCESS` but neither actually created an entry (`GET` immediately after still showed `Object: []`), so the write shape is confirmed *wrong* (or incomplete), not just unconfirmed. `pushNativeSchedule` (`accessControl.ts`) now verifies by re-reading after every write rather than trusting `ZCFG_SUCCESS` alone, and reports `enforcement: 'unenforced'` when the entry doesn't actually appear — this matters, keep it even after the payload gets corrected. Next step: try the `Type`/`Id` `ReplyMsg` hints as extra fields, or decompile the app bundle properly. `wan` OID wired up for `DashboardResponse.wan` (was declared in the type but never populated) — confirmed live: `{connected: true, type: "ETH", ipAddress: "100.70.170.143"}` against the real device. `connected` is inferred from `IPAddress` presence, not a field the router sends directly. Also confirmed live end-to-end against the real router: `/api/dashboard`, `/api/devices` (merged overlay + new-device detection), `/api/groups` (create/list/delete), `PATCH /api/devices/:mac` (nickname/icon/group assignment), `/api/devices/events`, `/api/speedtest` (323.8 Mbps down / 142.6 Mbps up / 101ms against Cloudflare).

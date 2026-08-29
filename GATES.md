# Gates: Hyperoptic mobile redesign

OWNS: GATES.md, PRODUCT.md, DESIGN.md, README.md, package.json, package-lock.json, packages/shared/**, packages/frontend/**, scripts/**, artifacts/**

Scope: ship a standalone, mobile-first Hyperoptic router app with four-tab navigation, trustworthy compatibility gating, local activity and diagnostics, documented feature tiers, and a signed APK.

- [x] G0: this ledger states outcomes that can fail
  CHECK: node /Users/parvsharma/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=958052e1be78d9acdd6d8ab18bb3126f4a183151119a69de38c6f4b36cac193d; output-bytes=150

- [x] G1: shared, backend, and redesigned frontend compile successfully
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=60306e87a9c9d41f906250f65ec5c89e84de8ea9db4a356cc5701b6d2d87e00d; output-bytes=1354

- [x] G2: mobile information architecture and accessibility contract are present
  CHECK: node scripts/verify-mobile-redesign.mjs
  EXPECT: mobile redesign verification passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=d581e5fc993636b9ea00efee86522e16e62da0d92bb3579fae475667c1df34d6; output-bytes=36

- [x] G3: compatibility detection and unverified-write protection are enforced
  CHECK: node scripts/verify-compatibility-safety.mjs
  EXPECT: compatibility safety verification passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=c6e8a71922d858f8e60f1a8baa0c4fbecab87c88829517116e132a66a09c123b; output-bytes=41

- [x] G4: local activity, diagnostics, migration, and notification controls are implemented
  CHECK: node scripts/verify-local-features.mjs
  EXPECT: local features verification passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=acdba6ca3f0188667be1a1c91264ddb094564f8680e74c473177f6c82648b44d; output-bytes=35

- [x] G5: GitHub documentation accurately describes Hyperoptic scope and model support
  CHECK: node scripts/verify-open-source-readiness.mjs
  EXPECT: open source readiness verification passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=b2b6f3fce817cc5d1e91a8528c93873ccd5f2fdd9de6ed945129b0bc9445afe4; output-bytes=42

- [x] G6: standalone release APK is rebuilt, signed, and contains no desktop dependency
  CHECK: node scripts/build-and-verify-android.mjs
  EXPECT: android release verification passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/parvsharma/Documents/Development/RouterManager; path=805ebf77119d/24 entries; EXPECT=matched; output-sha256=702fb526dbef1572aec8eab60d3411a98a730f2b6683695fb727f9b86c9c844d; output-bytes=22825

- [x] G7: key screens pass visual review at phone, tablet, desktop, light, and dark dimensions
  EVIDENCE: manual — reviewed Home, Devices, Device detail, Activity, Settings hub, Wi-Fi,
  Profiles, About & compatibility, Diagnostics, and Notifications via a Playwright pass
  against the dev server (mocked API responses, seeded session) at 390x844 (phone),
  820x1180 (tablet), and 1280x800 (desktop), each in light and dark where applicable — 32
  screenshots, zero console errors. Two real defects found and fixed during this pass:
  (1) the warning-state StatusPill paired near-white text with a near-white tinted
  background in light mode (illegible "Paused"/"Experimental" pills) — fixed in
  mobile-ui.tsx to use `text-warning` instead of `text-warning-foreground`; (2) the
  browser/dev-mode login and session-restore path unconditionally called the native-only
  RouterHttp plugin, which has no web implementation, so `npm run dev` + browser login was
  completely broken — fixed in AuthContext.tsx to branch on Capacitor.isNativePlatform()
  and use the backend's /api/auth/login on web. Re-verified clean after both fixes.

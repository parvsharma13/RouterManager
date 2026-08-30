import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- 1. Exactly the four-tab IA the plan specifies ---
const navItems = read('packages/frontend/src/lib/nav-items.ts');
const navPaths = [...navItems.matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1]);
assert(navPaths.length === 4, `NAV_ITEMS must have exactly 4 entries, found ${navPaths.length}`);
for (const expected of ['/', '/devices', '/activity', '/settings']) {
  assert(navPaths.includes(expected), `NAV_ITEMS is missing the ${expected} tab`);
}

const bottomNav = read('packages/frontend/src/components/layout/BottomNav.tsx');
assert(bottomNav.includes('NAV_ITEMS'), 'BottomNav must render from the shared NAV_ITEMS list, not a second hard-coded list');

// --- 2. Every internal link target actually has a matching route (no dead taps) ---
const appTsx = read('packages/frontend/src/App.tsx');
const routePaths = new Set([...appTsx.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]));
assert(routePaths.size >= 17, `Expected the full settings-nested route set, only found ${routePaths.size} routes`);

function routeExistsFor(target) {
  if (routePaths.has(target)) return true;
  // Match a dynamic segment, e.g. "/devices/AA:BB" against "/devices/:mac".
  for (const pattern of routePaths) {
    if (!pattern.includes(':')) continue;
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
    if (regex.test(target)) return true;
  }
  return false;
}

const pagesAndComponents = [
  'packages/frontend/src/pages/Dashboard.tsx',
  'packages/frontend/src/pages/Devices.tsx',
  'packages/frontend/src/pages/Settings.tsx',
  'packages/frontend/src/components/shared/mobile-ui.tsx',
  'packages/frontend/src/components/layout/Sidebar.tsx',
  'packages/frontend/src/components/layout/BottomNav.tsx',
];
const linkedTargets = new Set();
for (const file of pagesAndComponents) {
  for (const match of read(file).matchAll(/\bto="(\/[^"{]*)"/g)) linkedTargets.add(match[1]);
}
assert(linkedTargets.size >= 10, `Expected to find a substantial number of literal link targets to check, only found ${linkedTargets.size}`);
for (const target of linkedTargets) {
  assert(routeExistsFor(target), `Link target ${target} has no matching <Route> in App.tsx: dead navigation`);
}

// Negative control: an invented path must NOT appear to resolve, proving the checker can fail.
assert(!routeExistsFor('/this-route-does-not-exist-xyz'), 'route-existence check is vacuously true');

// --- 3. Groups renamed to Profiles, user-facing ---
assert(!fs.existsSync('packages/frontend/src/pages/Groups.tsx'), 'the old Groups page should be replaced by Profiles.tsx');
const profiles = read('packages/frontend/src/pages/Profiles.tsx');
assert(profiles.includes('title="Profiles"') || profiles.includes('>Profiles<'), 'Profiles page must present itself as "Profiles", not "Groups"');
assert(!/>\s*Groups\s*</.test(profiles), 'Profiles page must not still render the label "Groups"');

// --- 4. Accessibility contract: skip link, landmark, and 48dp touch targets ---
const appShell = read('packages/frontend/src/components/layout/AppShell.tsx');
assert(appShell.includes('href="#main-content"'), 'AppShell must include a skip-to-content link');
assert(appShell.includes('id="main-content"'), 'AppShell must expose the #main-content landmark the skip link targets');

const button = read('packages/frontend/src/components/ui/button.tsx');
assert(/default:\s*"h-12/.test(button), 'default Button size must meet the 48dp touch-target floor (h-12)');
const input = read('packages/frontend/src/components/ui/input.tsx');
assert(/"(?:h-1[2-9]|min-h-1[2-9])\b/.test(input), 'Input must meet or exceed the 48dp touch-target floor');

// --- 5. Every settings-nested write surface explains itself when read-only, per DESIGN.md ---
for (const file of ['packages/frontend/src/pages/WiFi.tsx', 'packages/frontend/src/pages/Profiles.tsx', 'packages/frontend/src/pages/PortForwarding.tsx']) {
  assert(/not yet available|disabled until|Saving is disabled/i.test(read(file)), `${file} must explain an unsupported/unverified write instead of silently disabling it`);
}

console.log('mobile redesign verification passed');

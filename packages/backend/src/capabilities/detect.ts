import {
  OID_LABELS,
  PROBED_OIDS,
  UNAVAILABLE_REASON,
  classifyRouterSupport,
  compatibilityMessage,
  writeReasonFor,
  writeStatusFor,
  type CapabilityMap,
  type FeatureCapability,
  type RouterCompatibility,
  type RouterSupportLevel,
} from '@router-manager/shared';
import { RouterClient } from '../router-client/RouterClient.js';
import { getSystemInfo } from '../router-client/endpoints/status.js';

export interface RouterState {
  capabilities: CapabilityMap;
  compatibility: RouterCompatibility;
}

let cache: RouterState | null = null;
let probeInFlight: Promise<RouterState> | null = null;

export async function detectCapabilities(client: RouterClient, forceRefresh = false): Promise<RouterState> {
  if (cache && !forceRefresh) return cache;
  // Coalesce concurrent callers (e.g. a fast page reload firing this twice before the
  // first probe finishes) into a single pass over the router instead of two full,
  // 16-request-each probes racing each other and doubling the load on it.
  if (probeInFlight) return probeInFlight;

  probeInFlight = probeAll(client);
  try {
    const state = await probeInFlight;
    cache = state;
    return state;
  } finally {
    probeInFlight = null;
  }
}

async function probeAll(client: RouterClient): Promise<RouterState> {
  // Router identity gates every write decision below, so it's read before the OID sweep
  // rather than folded into it. See docs/api-notes.md's status/DeviceInfo entry.
  const system = await getSystemInfo(client);
  const level = classifyRouterSupport(system.modelName);
  const compatibility: RouterCompatibility = {
    manufacturer: system.manufacturer || 'Unknown',
    model: system.modelName || 'Unknown router',
    firmware: system.softwareVersion || 'Unknown',
    supportLevel: level,
    detectedAt: new Date().toISOString(),
    message: compatibilityMessage(level),
  };

  const capabilities: CapabilityMap = {};
  for (const oid of PROBED_OIDS) {
    capabilities[oid] = await probeOne(client, oid, level, compatibility.firmware);
  }
  return { capabilities, compatibility };
}

async function probeOne(
  client: RouterClient,
  oid: string,
  level: RouterSupportLevel,
  firmware: string
): Promise<FeatureCapability> {
  try {
    await client.daoGet(oid);
    const write = writeStatusFor(oid, level);
    return {
      key: oid,
      label: OID_LABELS[oid],
      read: 'available',
      write,
      reason: writeReasonFor(write),
      source: 'live-probe',
      lastVerifiedFirmware: write === 'verified' ? firmware : null,
    };
  } catch {
    return {
      key: oid,
      label: OID_LABELS[oid],
      read: 'unavailable',
      write: 'blocked',
      reason: UNAVAILABLE_REASON,
      source: 'live-probe',
      lastVerifiedFirmware: null,
    };
  }
}

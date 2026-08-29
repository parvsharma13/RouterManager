import type { DiagnosticsResult } from '@router-manager/shared';
import { RouterClient } from '../router-client/RouterClient.js';
import { getWanStatus } from '../router-client/endpoints/wan.js';
import { recordEvent } from '../store/eventStore.js';

// Tracked in-process only (this app has no background poller; see deviceStore.ts's
// on-demand design note) so an offline→online flip is logged only when someone actually
// runs a check, not inferred from silence.
let lastWanConnected: boolean | null = null;

export async function runDiagnostics(client: RouterClient): Promise<DiagnosticsResult> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  let result: DiagnosticsResult;
  try {
    const wan = await getWanStatus(client);
    const latency = Date.now() - startedAt;
    result = {
      checkedAt,
      routerLatencyMs: latency,
      wanConnected: wan.connected,
      checks: [
        { key: 'router', label: 'Router', status: 'pass', detail: `Responded in ${latency} ms` },
        {
          key: 'wan',
          label: 'Internet',
          status: wan.connected ? 'pass' : 'fail',
          detail: wan.connected ? `WAN address ${wan.ipAddress}` : 'No WAN address reported',
        },
        {
          key: 'dns',
          label: 'DNS',
          status: wan.dnsServer ? 'pass' : 'warning',
          detail: wan.dnsServer || 'No DNS server reported',
        },
      ],
    };
  } catch {
    result = {
      checkedAt,
      routerLatencyMs: null,
      wanConnected: false,
      checks: [
        { key: 'router', label: 'Router', status: 'fail', detail: 'The router did not respond.' },
        { key: 'wan', label: 'Internet', status: 'fail', detail: 'WAN status could not be read.' },
        { key: 'dns', label: 'DNS', status: 'warning', detail: 'DNS could not be checked.' },
      ],
    };
  }

  if (lastWanConnected !== null && lastWanConnected !== result.wanConnected) {
    recordEvent({
      displayName: 'Router',
      eventType: result.wanConnected ? 'router_online' : 'router_offline',
      occurredAt: checkedAt,
    });
  }
  lastWanConnected = result.wanConnected;

  recordEvent({
    displayName: 'Network check',
    eventType: 'diagnostic_result',
    occurredAt: checkedAt,
    detail: result.checks.every((check) => check.status === 'pass') ? 'All essential checks passed' : 'Internet connection needs attention',
  });

  return result;
}

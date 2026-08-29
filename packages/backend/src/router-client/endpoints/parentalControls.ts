import type { RouterClient } from '../RouterClient.js';

// oid=paren_ctl — see docs/api-notes.md. Shape only partially confirmed live
// (PrentalCtlEnable, MaxLenPrentalCtlPrf — note the router's own typo "Prental").
// Kept as a passthrough until a real profile exists to confirm the rest of the shape.
interface ParenCtlDal {
  Object: Array<Record<string, unknown>>;
}

export async function getParentalControls(client: RouterClient): Promise<Record<string, unknown>> {
  const data = await client.daoGet<ParenCtlDal>('paren_ctl');
  return data.Object[0] ?? {};
}

import type { UsbDeviceStatus } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=usb_info: see docs/api-notes.md. Field names include literal spaces
// ("Service Conf", "Usb Info") in the raw response, so this stays a passthrough
// rather than a strict remapped type.
interface UsbInfoDal {
  Object: Array<Record<string, unknown>>;
}

export async function getUsbStatus(client: RouterClient): Promise<UsbDeviceStatus> {
  const data = await client.daoGet<UsbInfoDal>('usb_info');
  const entry = data.Object[0] ?? {};
  const usbInfo = entry['Usb Info'];
  const connected = Array.isArray(usbInfo) ? usbInfo.length > 0 : Boolean(usbInfo);
  return { connected, raw: entry };
}

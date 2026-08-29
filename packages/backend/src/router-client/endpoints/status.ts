import type { SystemInfo } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=status — see docs/api-notes.md. DeviceInfo carries system identity/uptime;
// WAN connection state lives alongside it in the same object.
interface StatusDal {
  Object: Array<{
    DeviceInfo?: {
      Manufacturer: string;
      ModelName: string;
      Description: string;
      SerialNumber: string;
      SoftwareVersion: string;
      HardwareVersion: string;
      UpTime: number;
    };
    [key: string]: unknown;
  }>;
}

export async function getSystemInfo(client: RouterClient): Promise<SystemInfo> {
  const data = await client.daoGet<StatusDal>('status');
  const deviceInfo = data.Object[0]?.DeviceInfo;
  if (!deviceInfo) throw new Error('status oid did not include DeviceInfo — router response shape may have changed');
  return {
    manufacturer: deviceInfo.Manufacturer,
    modelName: deviceInfo.ModelName,
    description: deviceInfo.Description,
    serialNumber: deviceInfo.SerialNumber,
    softwareVersion: deviceInfo.SoftwareVersion,
    hardwareVersion: deviceInfo.HardwareVersion,
    upTimeSeconds: deviceInfo.UpTime,
  };
}

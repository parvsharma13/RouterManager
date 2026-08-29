import { z } from 'zod';
import type { DeviceIcon } from '@router-manager/shared';

// Keep in sync with DeviceIcon in packages/shared/src/types/app-data.ts.
const DEVICE_ICONS = [
  'phone',
  'laptop',
  'desktop',
  'tablet',
  'tv',
  'speaker',
  'console',
  'camera',
  'iot',
  'other',
] as const satisfies readonly DeviceIcon[];

export const DEVICE_ICON_SCHEMA = z.enum(DEVICE_ICONS);

import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Tv,
  Speaker,
  Gamepad2,
  Camera,
  Cpu,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { DeviceIcon } from '@router-manager/shared';

export const DEVICE_ICON_MAP: Record<DeviceIcon, LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  desktop: Monitor,
  tablet: Tablet,
  tv: Tv,
  speaker: Speaker,
  console: Gamepad2,
  camera: Camera,
  iot: Cpu,
  other: HelpCircle,
};

export const DEVICE_ICON_LABELS: Record<DeviceIcon, string> = {
  phone: 'Phone',
  laptop: 'Laptop',
  desktop: 'Desktop',
  tablet: 'Tablet',
  tv: 'TV',
  speaker: 'Speaker',
  console: 'Game console',
  camera: 'Camera',
  iot: 'Smart home',
  other: 'Other',
};

export const DEVICE_ICONS = Object.keys(DEVICE_ICON_MAP) as DeviceIcon[];

export function deviceIconComponent(icon: DeviceIcon | null): LucideIcon {
  return icon ? DEVICE_ICON_MAP[icon] : HelpCircle;
}

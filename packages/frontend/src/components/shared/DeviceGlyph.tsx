import { createElement, type ComponentProps } from 'react';
import type { DeviceIcon } from '@router-manager/shared';
import { deviceIconComponent } from '@/lib/device-icons';

export function DeviceGlyph({ icon, ...props }: { icon: DeviceIcon | null } & Omit<ComponentProps<'svg'>, 'ref'>) {
  return createElement(deviceIconComponent(icon), props);
}

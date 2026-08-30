import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-12 w-[3.25rem] shrink-0 items-center rounded-full bg-transparent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:opacity-[0.38]",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 h-8 w-[3.25rem] -translate-y-1/2 rounded-full border-2 border-input bg-surface-container-highest transition-[background-color,border-color] duration-200 group-data-[state=checked]/switch:border-primary group-data-[state=checked]/switch:bg-primary"
      />
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute left-1 top-1/2 block size-6 -translate-y-1/2 rounded-full bg-on-surface-variant ring-0 transition-[transform,background-color] duration-200 ease-[var(--motion-standard)] data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

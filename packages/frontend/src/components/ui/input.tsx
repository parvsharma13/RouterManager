import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Material text fields use a 56dp container, exceeding the 48dp touch-target floor.
        "h-14 w-full min-w-0 rounded-xl border border-input bg-surface-container-lowest px-4 py-2 text-base transition-[border-color,box-shadow,background-color] duration-200 outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-on-surface-variant disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.38] md:text-sm",
        "hover:border-on-surface focus-visible:border-2 focus-visible:border-primary focus-visible:px-[15px] focus-visible:ring-0",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/18",
        className
      )}
      {...props}
    />
  )
}

export { Input }

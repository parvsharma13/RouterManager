import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold tracking-[0.006em] whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-[0.38] aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(15_23_42/0.18)] hover:shadow-[0_2px_5px_rgb(15_23_42/0.2)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgb(15_23_42/0.16)] focus-visible:ring-destructive/35",
        outline:
          "border border-outline-variant bg-transparent text-primary hover:bg-primary/8",
        secondary:
          "bg-secondary-container text-secondary-container-foreground hover:bg-secondary-container/80",
        ghost:
          "text-foreground hover:bg-on-surface/8",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Default and icon meet the 48dp touch-target floor from DESIGN.md; lg is the
        // 52dp size reserved for a screen's single primary action. xs/sm/icon-xs/icon-sm
        // stay compact for dense inline row actions where a 48dp box would break layout.
        default: "h-12 px-6 py-2 has-[>svg]:px-5",
        xs: "h-12 gap-1 rounded-full px-3 text-xs has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-12 gap-1.5 rounded-full px-4 has-[>svg]:px-3.5",
        lg: "h-[3.25rem] rounded-full px-7 has-[>svg]:px-6",
        icon: "size-12",
        "icon-xs": "size-12 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-12",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

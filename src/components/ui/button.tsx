import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium " +
    "transition-[background-color,box-shadow,color,transform] duration-150 ease-out outline-none " +
    "focus-visible:ring-[3px] focus-visible:ring-emerald/35 focus-visible:outline-none " +
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-emerald text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(11_143_104/0.35)] hover:bg-emerald-deep",
        secondary:
          "bg-surface text-foreground shadow-soft-sm ring-1 ring-line hover:bg-surface-sunken dark:bg-surface-raised",
        ghost: "text-foreground hover:bg-surface-sunken",
        subtle: "bg-emerald-soft text-emerald-ink hover:bg-emerald/20",
        danger: "bg-coral-soft text-coral-ink hover:bg-coral/20",
        link: "h-auto px-0 text-emerald-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-caption",
        md: "h-10 px-4 text-[0.875rem]",
        lg: "h-12 px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export { Button, buttonVariants };

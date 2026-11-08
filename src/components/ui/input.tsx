import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 text-[0.9375rem] text-foreground shadow-soft-sm " +
  "transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/80 " +
  "focus-visible:border-emerald focus-visible:ring-[3px] focus-visible:ring-emerald/25 focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-coral aria-invalid:ring-[3px] aria-invalid:ring-coral/20 " +
  "dark:bg-surface-sunken";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(field, "h-11", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(field, "field-sizing-content min-h-28 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export { Input, Textarea, field as fieldClassName };

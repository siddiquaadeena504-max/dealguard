"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      offset={24}
      mobileOffset={{ bottom: 88 }}
      icons={{
        success: <CheckCircle2 className="size-4 text-emerald-ink" />,
        error: <AlertTriangle className="size-4 text-coral-ink" />,
        info: <Info className="size-4 text-foreground/70" />,
        loading: <Loader2 className="size-4 animate-spin text-foreground/70" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-0 !bg-surface-raised !text-foreground !shadow-soft-lg !ring-1 !ring-line !font-sans !gap-3 !px-4 !py-3.5",
          title: "!text-[0.875rem] !font-medium",
          description: "!text-caption !text-muted-foreground",
          actionButton: "!rounded-lg !bg-emerald !text-ink !font-medium",
        },
      }}
    />
  );
}

export { toast } from "sonner";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        healthy: "bg-green-100 text-green-800",
        active: "bg-green-100 text-green-800",
        online: "bg-green-100 text-green-800",
        warning: "bg-amber-100 text-amber-800",
        stale: "bg-amber-100 text-amber-800",
        idle: "bg-slate-100 text-slate-600",
        error: "bg-red-100 text-red-800",
        offline: "bg-red-100 text-red-800",
        pending: "bg-blue-100 text-blue-800",
        archived: "bg-slate-100 text-slate-500",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  pulse?: boolean;
}

function StatusBadge({
  className,
  status,
  pulse = false,
  children,
  ...props
}: StatusBadgeProps) {
  const showPulse = pulse || status === "active" || status === "online";

  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {showPulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              status === "healthy" || status === "active" || status === "online"
                ? "bg-green-500"
                : status === "warning" || status === "stale"
                ? "bg-amber-500"
                : "bg-red-500"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status === "healthy" || status === "active" || status === "online"
                ? "bg-green-600"
                : status === "warning" || status === "stale"
                ? "bg-amber-600"
                : "bg-red-600"
            )}
          />
        </span>
      )}
      {children || status}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };

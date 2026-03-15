import * as React from "react";
import { cn } from "../utils/cn";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  description?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, trend, icon, description, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow p-5",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {(trend || description) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  )
);
StatCard.displayName = "StatCard";

export { StatCard };

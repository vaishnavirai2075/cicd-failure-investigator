import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaPositive,
  deltaVariant,
  Icon,
  accent = "text-primary",
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaPositive?: boolean;
  deltaVariant?: "default" | "danger";
  Icon: LucideIcon;
  accent?: string;
}) {
  const deltaColor =
    deltaVariant === "danger"
      ? "text-danger"
      : deltaPositive
        ? "text-success"
        : "text-danger";

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className={cn("rounded-lg bg-accent/60 p-2", accent)}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {delta && delta !== "—" && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              deltaColor,
            )}
          >
            {deltaPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta}
          </span>
          <span className="text-xs text-muted-foreground">vs last 14d</span>
        </div>
      )}
    </div>
  );
}

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: "default" | "success" | "danger" | "warning";
  loading?: boolean;
}

const ACCENT_CLASSES = {
  default: "text-accent",
  success: "text-success",
  danger:  "text-danger",
  warning: "text-warning",
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "default",
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <Icon
            size={16}
            className={`${ACCENT_CLASSES[accent]} opacity-70`}
          />
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-surface-hover rounded animate-pulse" />
      ) : (
        <span
          className={`text-3xl font-bold font-mono ${ACCENT_CLASSES[accent]}`}
        >
          {value}
        </span>
      )}
      {sub && (
        <span className="text-xs text-text-muted">{sub}</span>
      )}
    </div>
  );
}
import { cn } from "@/lib/utils";
import type { BuildStatus } from "@/lib/data";

const MAP: Record<BuildStatus, { label: string; cls: string; dot: string }> = {
  success: {
    label: "Success",
    cls: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    cls: "bg-danger/10 text-danger border-danger/25",
    dot: "bg-danger",
  },
  running: {
    label: "Running",
    cls: "bg-info/10 text-info border-info/25",
    dot: "bg-info animate-pulse",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BuildStatus;
  className?: string;
}) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { RootCause } from "@/lib/data";
import {
  Bug,
  Package,
  AlignLeft,
  Braces,
  Clock,
  MemoryStick,
  Settings2,
  Minus,
} from "lucide-react";

const MAP: Record<RootCause, { cls: string; Icon: typeof Bug }> = {
  "Flaky Test": { cls: "bg-amber-500/10 text-amber-400 border-amber-500/25", Icon: Bug },
  Dependency: { cls: "bg-info/10 text-info border-info/25", Icon: Package },
  "Lint Error": { cls: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25", Icon: AlignLeft },
  "Type Error": { cls: "bg-primary/10 text-primary border-primary/25", Icon: Braces },
  Timeout: { cls: "bg-orange-500/10 text-orange-400 border-orange-500/25", Icon: Clock },
  OOM: { cls: "bg-danger/10 text-danger border-danger/25", Icon: MemoryStick },
  Config: { cls: "bg-teal-500/10 text-teal-400 border-teal-500/25", Icon: Settings2 },
  None: { cls: "bg-muted text-muted-foreground border-border", Icon: Minus },
};

export function RootCauseBadge({
  cause,
  className,
}: {
  cause: RootCause;
  className?: string;
}) {
  const { cls, Icon } = MAP[cause];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {cause === "None" ? "—" : cause}
    </span>
  );
}

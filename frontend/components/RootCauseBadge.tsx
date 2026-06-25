type RootCause =
  | "FLAKY_TEST"
  | "DEPENDENCY_CHANGE"
  | "ENV_DRIFT"
  | "CODE_BUG"
  | "INFRA_FAILURE"
  | "TIMEOUT"
  | "UNKNOWN"
  | string;

const CAUSE_CONFIG: Record<string, { label: string; classes: string }> = {
  FLAKY_TEST:        { label: "Flaky Test",        classes: "bg-warning/10 text-warning border-warning/20" },
  DEPENDENCY_CHANGE: { label: "Dependency Change", classes: "bg-accent/10 text-accent border-accent/20" },
  ENV_DRIFT:         { label: "Env Drift",         classes: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CODE_BUG:          { label: "Code Bug",          classes: "bg-danger/10 text-danger border-danger/20" },
  INFRA_FAILURE:     { label: "Infra Failure",     classes: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  TIMEOUT:           { label: "Timeout",           classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  UNKNOWN:           { label: "Unknown",           classes: "bg-text-muted/10 text-text-muted border-text-muted/20" },
};

export default function RootCauseBadge({ cause }: { cause: RootCause }) {
  const config = CAUSE_CONFIG[cause] ?? CAUSE_CONFIG["UNKNOWN"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border font-mono ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
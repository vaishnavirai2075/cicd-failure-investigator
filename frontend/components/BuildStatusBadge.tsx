type Status = "success" | "failure" | "in_progress" | string;

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  success: {
    label: "Success",
    classes: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  failure: {
    label: "Failed",
    classes: "bg-danger/10 text-danger border-danger/20",
    dot: "bg-danger",
  },
  in_progress: {
    label: "Running",
    classes: "bg-accent/10 text-accent border-accent/20",
    dot: "bg-accent animate-pulse",
  },
};

export default function BuildStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: "bg-text-muted/10 text-text-muted border-text-muted/20",
    dot: "bg-text-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
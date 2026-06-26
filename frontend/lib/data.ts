export type BuildStatus = "failed" | "success" | "running";

export type RootCause =
  | "Flaky Test" | "Dependency" | "Lint Error" | "Type Error"
  | "Timeout" | "OOM" | "Config" | "None";

export interface Build {
  id: string; repo: string; branch: string; status: BuildStatus;
  rootCause: RootCause; author: string; durationSec: number;
  createdAt: string; commitMessage: string; triggeredBy: string; pipeline: string;
}

export interface Investigation {
  rootCause: RootCause; confidence: number;
  summary: string; proposedFixMarkdown: string; trace: string[];
}

export interface TestResult {
  name: string; status: "passed" | "failed" | "skipped";
  durationMs: number; suite: string;
}

export interface BuildDetail extends Build {
  logs: { time: string; level: "info" | "warn" | "error"; message: string }[];
  tests: TestResult[];
  investigation: Investigation | null;
  steps: { name: string; status: BuildStatus; durationSec: number }[];
}

export interface DailyStat {
  date: string; success: number; failed: number;
}

export interface OverviewStats {
  total_builds: number;
  success_builds: number;
  failed_builds: number;
  success_rate: number;
  avg_duration_sec: number;
  open_investigations: number;
}

export interface TrendDelta {
  delta: string;
  positive: boolean;
}

// ── Backend mappers ───────────────────────────────────────────────────────────

export function mapStatus(s: string): BuildStatus {
  if (s === "failure") return "failed";
  if (s === "in_progress") return "running";
  return "success";
}

export function mapRootCause(cause?: string | null): RootCause {
  const map: Record<string, RootCause> = {
    FLAKY_TEST: "Flaky Test", DEPENDENCY_CHANGE: "Dependency",
    ENV_DRIFT: "Config", CODE_BUG: "Type Error",
    INFRA_FAILURE: "OOM", TIMEOUT: "Timeout", UNKNOWN: "None",
  };
  return map[cause ?? ""] ?? "None";
}

export function mapBuild(
  b: Record<string, unknown>,
  invMap: Record<string, string> = {}
): Build {
  return {
    id: b.build_id as string,
    repo: ((b.repo as string) ?? "").split("/").pop() ?? (b.repo as string),
    branch: (b.branch as string) ?? "main",
    status: mapStatus(b.status as string),
    rootCause: mapRootCause(invMap[b.build_id as string]),
    author: (b.author as string) ?? "unknown",
    durationSec: (b.duration_sec as number) ?? 0,
    createdAt: (b.created_at as string) ?? new Date().toISOString(),
    commitMessage: (b.commit_msg as string) ?? "",
    triggeredBy: (b.triggered_by as string) ?? "push",
    pipeline: "ci / build",
  };
}

export function mapInvestigation(raw: Record<string, unknown>): Investigation {
  const traceRaw = (raw.reasoning_trace as Record<string, unknown>[]) ?? [];
  const trace: string[] = traceRaw.map((e) => {
    const type = (e.type as string) ?? "step";
    const content = typeof e.content === "string"
      ? e.content.slice(0, 160)
      : JSON.stringify(e.content).slice(0, 160);
    const label = type === "HumanMessage" ? "init"
      : type === "AIMessage" ? "agent"
      : type === "tool" ? "inspect"
      : "analyze";
    return `${label}: ${content}`;
  });

  return {
    rootCause: mapRootCause(raw.root_cause as string),
    confidence: Math.round(((raw.confidence as number) ?? 0) * 100),
    summary: (raw.summary as string) ?? "",
    proposedFixMarkdown: (raw.proposed_fix as string) ?? "",
    trace,
  };
}

export function mapDailyStats(
  raw: { date: string; success: number; failure: number }[]
): DailyStat[] {
  return raw.map((d) => ({
    date: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    }),
    success: d.success,
    failed: d.failure,
  }));
}

export function mapStepsFromLogs(
  rawLogs: Record<string, unknown>[],
  buildStatus: BuildStatus,
  totalDurationSec: number
): BuildDetail["steps"] {
  const steps: { name: string; hasError: boolean; order: number }[] = [];
  const seen = new Set<string>();

  for (const log of rawLogs) {
    const name = (log.step_name as string) ?? "Step";
    if (seen.has(name)) continue;
    seen.add(name);
    const text = ((log.log_text as string) ?? "").toLowerCase();
    const hasError =
      text.includes("error") ||
      text.includes("fail") ||
      text.includes("err!") ||
      text.includes("exit code 1");
    steps.push({ name, hasError, order: steps.length });
  }

  if (steps.length === 0) return [];

  const perStep = Math.max(1, Math.floor(totalDurationSec / steps.length));
  let remaining = totalDurationSec;

  return steps.map((s, i) => {
    const isLast = i === steps.length - 1;
    const durationSec = isLast ? remaining : Math.min(perStep, remaining);
    remaining -= durationSec;

    let status: BuildStatus = "success";
    if (s.hasError) status = "failed";
    else if (buildStatus === "running" && isLast) status = "running";
    else if (buildStatus === "failed" && isLast && !s.hasError) status = "success";

    return { name: s.name, status, durationSec: Math.max(1, durationSec) };
  });
}

export function computeTrendDeltas(daily: DailyStat[]): {
  totalBuilds: TrendDelta;
  successRate: TrendDelta;
  failedBuilds: TrendDelta & { increased: boolean };
} {
  if (daily.length < 2) {
    const empty = { delta: "—", positive: true, increased: false };
    return { totalBuilds: empty, successRate: empty, failedBuilds: empty };
  }

  const mid = Math.floor(daily.length / 2);
  const first = daily.slice(0, mid);
  const second = daily.slice(mid);

  const sum = (arr: DailyStat[], key: "success" | "failed") =>
    arr.reduce((s, d) => s + d[key], 0);
  const total = (arr: DailyStat[]) => sum(arr, "success") + sum(arr, "failed");

  const pct = (a: number, b: number) => {
    if (a === 0) return b > 0 ? 100 : 0;
    return Math.round((Math.abs(b - a) / a) * 1000) / 10;
  };

  const t1 = total(first);
  const t2 = total(second);
  const f1 = sum(first, "failed");
  const f2 = sum(second, "failed");
  const sr1 = t1 ? (sum(first, "success") / t1) * 100 : 0;
  const sr2 = t2 ? (sum(second, "success") / t2) * 100 : 0;

  return {
    totalBuilds: {
      delta: `${pct(t1, t2)}%`,
      positive: t2 >= t1,
    },
    successRate: {
      delta: `${pct(sr1, sr2)}%`,
      positive: sr2 >= sr1,
    },
    failedBuilds: {
      delta: `${pct(f1, f2)}%`,
      positive: f2 < f1,
      increased: f2 >= f1,
    },
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function initials(name: string): string {
  return name.split(/[\s._-]+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

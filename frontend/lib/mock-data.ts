import type { BuildRow } from "@/components/BuildTable";
import type { TerminalLine } from "@/components/TerminalPanel";

export interface OverviewStats {
  total_builds: number;
  failed_builds: number;
  success_rate: number;
  avg_duration_sec: number;
  open_investigations: number;
}

export interface DailyPoint {
  date: string;
  success: number;
  failure: number;
}

export interface TestResult {
  id: number;
  test_name: string;
  status: "passed" | "failed" | "skipped";
  duration_ms: number;
  error_msg?: string;
}

export interface BuildLog {
  id: number;
  step_name: string;
  log_text: string;
}

export interface Investigation {
  status: "pending" | "running" | "complete" | "failed";
  root_cause: string;
  confidence: number;
  summary: string;
  proposed_fix: string;
  similar_builds: { build_id: string; repo: string }[];
  reasoning_trace: TerminalLine[];
}

export interface BuildDetail extends BuildRow {
  commit_sha: string;
  commit_msg: string;
  triggered_by: string;
  tests: TestResult[];
  logs: BuildLog[];
  investigation: Investigation | null;
}

export const overviewStats: OverviewStats = {
  total_builds: 1284,
  failed_builds: 92,
  success_rate: 92.8,
  avg_duration_sec: 247,
  open_investigations: 7,
};

// 14 days of success/failure counts
export const dailyBuilds: DailyPoint[] = [
  { date: "Jun 13", success: 74, failure: 6 },
  { date: "Jun 14", success: 81, failure: 4 },
  { date: "Jun 15", success: 68, failure: 11 },
  { date: "Jun 16", success: 90, failure: 3 },
  { date: "Jun 17", success: 85, failure: 7 },
  { date: "Jun 18", success: 79, failure: 9 },
  { date: "Jun 19", success: 92, failure: 2 },
  { date: "Jun 20", success: 71, failure: 14 },
  { date: "Jun 21", success: 88, failure: 5 },
  { date: "Jun 22", success: 95, failure: 4 },
  { date: "Jun 23", success: 82, failure: 8 },
  { date: "Jun 24", success: 77, failure: 12 },
  { date: "Jun 25", success: 91, failure: 3 },
  { date: "Jun 26", success: 86, failure: 6 },
];

export const builds: BuildRow[] = [
  {
    build_id: "bld_7f3a9c2e8b1d4f60",
    repo: "vercel/commerce",
    branch: "main",
    status: "failure",
    author: "Sofia Andersson",
    duration_sec: 312,
    created_at: "2026-06-26T09:42:00Z",
    root_cause: "DEPENDENCY_CHANGE",
  },
  {
    build_id: "bld_2c8e1a7d9f0b3e54",
    repo: "vercel/next.js",
    branch: "release/15.4",
    status: "success",
    author: "Marcus Lee",
    duration_sec: 198,
    created_at: "2026-06-26T09:15:00Z",
  },
  {
    build_id: "bld_b4d6f8021a3c5e79",
    repo: "acme/payments-api",
    branch: "feat/webhooks",
    status: "failure",
    author: "Priya Nair",
    duration_sec: 421,
    created_at: "2026-06-26T08:51:00Z",
    root_cause: "FLAKY_TEST",
  },
  {
    build_id: "bld_9a1c3e5f7b2d4068",
    repo: "acme/dashboard",
    branch: "main",
    status: "in_progress",
    author: "Tom Becker",
    duration_sec: null,
    created_at: "2026-06-26T08:33:00Z",
  },
  {
    build_id: "bld_5e7f9b1d3a2c4680",
    repo: "vercel/turborepo",
    branch: "fix/cache",
    status: "failure",
    author: "Elena García",
    duration_sec: 156,
    created_at: "2026-06-26T07:58:00Z",
    root_cause: "ENV_DRIFT",
  },
  {
    build_id: "bld_0d2f4a6c8e1b3759",
    repo: "acme/auth-service",
    branch: "main",
    status: "success",
    author: "Jordan Smith",
    duration_sec: 234,
    created_at: "2026-06-26T07:21:00Z",
  },
  {
    build_id: "bld_6b8d0f2a4c6e8013",
    repo: "acme/payments-api",
    branch: "main",
    status: "failure",
    author: "Priya Nair",
    duration_sec: 389,
    created_at: "2026-06-26T06:44:00Z",
    root_cause: "CODE_BUG",
  },
  {
    build_id: "bld_3c5e7a9d1f0b2468",
    repo: "vercel/commerce",
    branch: "feat/search",
    status: "success",
    author: "Sofia Andersson",
    duration_sec: 267,
    created_at: "2026-06-26T06:12:00Z",
  },
  {
    build_id: "bld_8f0a2c4e6b8d1357",
    repo: "acme/mobile-app",
    branch: "main",
    status: "failure",
    author: "Wei Chen",
    duration_sec: 512,
    created_at: "2026-06-26T05:39:00Z",
    root_cause: "INFRA_FAILURE",
  },
  {
    build_id: "bld_1d3f5a7c9e0b2846",
    repo: "acme/dashboard",
    branch: "fix/charts",
    status: "failure",
    author: "Tom Becker",
    duration_sec: 600,
    created_at: "2026-06-26T05:02:00Z",
    root_cause: "TIMEOUT",
  },
];

const investigationByBuild: Record<string, Investigation> = {
  bld_7f3a9c2e8b1d4f60: {
    status: "complete",
    root_cause: "DEPENDENCY_CHANGE",
    confidence: 0.94,
    summary:
      "The build failed during the install step because `@radix-ui/react-dialog` was bumped from 1.0.5 to 1.1.0 in a transitive dependency, introducing a peer-dependency conflict with the pinned React 18.2.0. The lockfile was not regenerated, so CI resolved an incompatible tree and the type-check step failed with 14 errors in the dialog components.",
    proposed_fix: `### Proposed Fix

Regenerate the lockfile against the pinned React version and re-pin the Radix dialog package.

\`\`\`bash
# Pin the compatible version
pnpm add @radix-ui/react-dialog@1.0.5 --save-exact

# Regenerate the lockfile
pnpm install --no-frozen-lockfile
\`\`\`

**Then** add an overrides block to \`package.json\` to prevent transitive drift:

\`\`\`json
{
  "pnpm": {
    "overrides": {
      "@radix-ui/react-dialog": "1.0.5"
    }
  }
}
\`\`\`

This locks the dependency tree and restores compatibility with React 18.2.0.`,
    similar_builds: [
      { build_id: "bld_6b8d0f2a4c6e8013", repo: "acme/payments-api" },
      { build_id: "bld_5e7f9b1d3a2c4680", repo: "vercel/turborepo" },
    ],
    reasoning_trace: [
      { type: "system", content: "Investigation started for build bld_7f3a9c2e8b1d4f60" },
      { type: "tool_call", content: "fetch_build_logs(build_id=bld_7f3a9c2e8b1d4f60)" },
      { type: "tool_result", content: "Retrieved 4 log steps (install, type-check, test, build)" },
      { type: "reasoning", content: "type-check step exited with code 1, 14 TS errors located in components/ui/dialog.tsx" },
      { type: "tool_call", content: "diff_lockfile(base=main, head=HEAD)" },
      { type: "tool_result", content: "@radix-ui/react-dialog 1.0.5 -> 1.1.0 (transitive via @radix-ui/react-alert-dialog)" },
      { type: "reasoning", content: "1.1.0 requires react>=18.3, project pins react@18.2.0 — peer conflict confirmed" },
      { type: "tool_call", content: "search_similar_failures(signature='radix peer react')" },
      { type: "tool_result", content: "2 historical matches with identical root cause" },
      { type: "result", content: "Root cause: DEPENDENCY_CHANGE (confidence 0.94). Fix proposed." },
    ],
  },
  bld_b4d6f8021a3c5e79: {
    status: "complete",
    root_cause: "FLAKY_TEST",
    confidence: 0.81,
    summary:
      "The failure is isolated to `test_webhook_retry_backoff`, which depends on wall-clock timing and intermittently exceeds its 200ms assertion window under CI load. The same test passed on the previous 3 of 4 runs with no code changes to the webhook module, indicating non-determinism rather than a regression.",
    proposed_fix: `### Proposed Fix

Replace the real timer with a fake clock and assert on calls instead of elapsed time.

\`\`\`python
def test_webhook_retry_backoff(freezer):
    client = WebhookClient(max_retries=3)
    with freeze_time("2026-01-01") as frozen:
        client.send(payload, on_retry=lambda: frozen.tick(0.2))
    assert client.attempts == 3
\`\`\`

This removes dependence on real elapsed time and makes the test deterministic under load.`,
    similar_builds: [{ build_id: "bld_3c5e7a9d1f0b2468", repo: "vercel/commerce" }],
    reasoning_trace: [
      { type: "system", content: "Investigation started for build bld_b4d6f8021a3c5e79" },
      { type: "tool_call", content: "fetch_test_results(build_id=bld_b4d6f8021a3c5e79)" },
      { type: "tool_result", content: "1 failed / 247 passed — test_webhook_retry_backoff" },
      { type: "reasoning", content: "Failure asserts elapsed < 200ms but measured 214ms — timing sensitive" },
      { type: "tool_call", content: "git_blame(file=tests/test_webhooks.py)" },
      { type: "tool_result", content: "No changes to webhook module in last 30 commits" },
      { type: "reasoning", content: "Passed 3/4 recent runs with no relevant diff → flaky, not regression" },
      { type: "result", content: "Root cause: FLAKY_TEST (confidence 0.81). Fix proposed." },
    ],
  },
};

export function getBuildDetail(buildId: string): BuildDetail {
  const base =
    builds.find((b) => b.build_id === buildId) ?? builds[0];

  return {
    ...base,
    build_id: buildId,
    commit_sha: "a3f9c2e",
    commit_msg: "chore: upgrade ui dependencies and refactor dialog primitives",
    triggered_by: "push",
    investigation: investigationByBuild[buildId] ?? investigationByBuild.bld_7f3a9c2e8b1d4f60,
    tests: [
      { id: 1, test_name: "dialog renders trigger and content", status: "failed", duration_ms: 42, error_msg: "TS2322: Type 'DialogProps' is not assignable to type 'IntrinsicAttributes'." },
      { id: 2, test_name: "dialog closes on escape key", status: "failed", duration_ms: 38, error_msg: "TS2741: Property 'modal' is missing in type." },
      { id: 3, test_name: "auth: login with valid credentials", status: "passed", duration_ms: 121 },
      { id: 4, test_name: "auth: rejects expired token", status: "passed", duration_ms: 88 },
      { id: 5, test_name: "cart: add item updates total", status: "passed", duration_ms: 64 },
      { id: 6, test_name: "cart: legacy checkout flow", status: "skipped", duration_ms: 0 },
      { id: 7, test_name: "api: webhook signature verification", status: "passed", duration_ms: 156 },
    ],
    logs: [
      {
        id: 1,
        step_name: "Install dependencies",
        log_text:
          "$ pnpm install --frozen-lockfile\nLockfile is up to date, resolution step is skipped\nPackages: +1284\nProgress: resolved 1284, reused 1280, downloaded 4, added 1284\n WARN  peer react@\"^18.3.0\" from @radix-ui/react-dialog@1.1.0\n WARN  found: react@18.2.0\nDone in 18.4s",
      },
      {
        id: 2,
        step_name: "Type check",
        log_text:
          "$ tsc --noEmit\ncomponents/ui/dialog.tsx:24:7 - error TS2322: Type 'DialogProps' is not assignable.\ncomponents/ui/dialog.tsx:51:3 - error TS2741: Property 'modal' is missing in type.\n... 12 more errors\nFound 14 errors in 1 file.\nExit code 1",
      },
      {
        id: 3,
        step_name: "Run tests",
        log_text:
          "$ pnpm test\nstep skipped: previous step failed\nExit code 1",
      },
    ],
  };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

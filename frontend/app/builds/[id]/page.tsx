import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StatusBadge } from "@/components/status-badge";
import { AuthorAvatar } from "@/components/author-avatar";
import { BuildTabs } from "@/components/build-tabs";
import { InvestigationPanel } from "@/components/investigation-panel";
import {
  mapStatus,
  mapInvestigation,
  mapStepsFromLogs,
  timeAgo,
  type BuildDetail,
  type Investigation,
} from "@/lib/data";
import { API_BASE } from "@/lib/api";

async function getData(
  id: string,
): Promise<{ build: BuildDetail; investigation: Investigation | null }> {
  const [buildRes, invRes] = await Promise.allSettled([
    fetch(`${API_BASE}/builds/${id}`, { cache: "no-store" }),
    fetch(`${API_BASE}/investigations/${id}`, { cache: "no-store" }),
  ]);

  if (buildRes.status === "rejected" || !buildRes.value.ok) notFound();

  const raw = (await buildRes.value.json()) as Record<string, unknown>;
  const status = mapStatus(raw.status as string);
  const durationSec = (raw.duration_sec as number) ?? 0;

  const rawLogs = (raw.logs as Record<string, unknown>[] | undefined) ?? [];
  const logs = rawLogs.flatMap((l) => {
    const text = (l.log_text as string) ?? "";
    return text.split("\n").filter(Boolean).map((line) => ({
      time: (l.created_at as string) ?? new Date().toISOString(),
      level: inferLevel(line),
      message: line,
    }));
  });

  const rawTests = (raw.tests as Record<string, unknown>[] | undefined) ?? [];
  const tests = rawTests.map((t) => ({
    name: (t.test_name as string) ?? "unknown",
    status: mapTestStatus(t.status as string),
    durationMs: (t.duration_ms as number) ?? 0,
    suite: extractSuite(t.test_name as string),
  }));

  let investigation: Investigation | null = null;
  if (invRes.status === "fulfilled" && invRes.value.ok) {
    const rawInv = (await invRes.value.json()) as Record<string, unknown>;
    if (rawInv.status === "complete") {
      investigation = mapInvestigation(rawInv);
    }
  } else if (raw.investigation) {
    const embedded = raw.investigation as Record<string, unknown>;
    if (embedded.status === "complete") {
      investigation = mapInvestigation(embedded);
    }
  }

  const build: BuildDetail = {
    id: raw.build_id as string,
    repo: ((raw.repo as string) ?? "").split("/").pop() ?? (raw.repo as string),
    branch: (raw.branch as string) ?? "main",
    status,
    rootCause: investigation?.rootCause ?? "None",
    author: (raw.author as string) ?? "unknown",
    durationSec,
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    commitMessage: (raw.commit_msg as string) ?? "",
    triggeredBy: (raw.triggered_by as string) ?? "push",
    pipeline: "ci / build",
    logs,
    tests,
    investigation,
    steps: mapStepsFromLogs(rawLogs, status, durationSec),
  };

  return { build, investigation };
}

function mapTestStatus(s: string): "passed" | "failed" | "skipped" {
  if (s === "passed") return "passed";
  if (s === "skipped") return "skipped";
  return "failed";
}

function inferLevel(text: string): "info" | "warn" | "error" {
  const t = (text ?? "").toLowerCase();
  if (t.includes("error") || t.includes("fail") || t.includes("fatal"))
    return "error";
  if (t.includes("warn")) return "warn";
  return "info";
}

function extractSuite(name: string): string {
  if (!name) return "General";
  const parts = name.split(/[/\\>]/);
  return parts.length > 1 ? parts[0] : "General";
}

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { build, investigation } = await getData(id);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            {build.id}
          </h1>
          <StatusBadge status={build.status} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{build.repo}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-0.5 font-mono text-xs">
            <GitBranch className="h-3 w-3" />
            {build.branch}
          </span>
          <span className="flex items-center gap-1.5">
            <AuthorAvatar name={build.author} size={22} />
            {build.author}
          </span>
          <span className="font-mono text-xs">{timeAgo(build.createdAt)}</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <BuildTabs build={build} />
          </div>
          <div className="lg:col-span-2">
            <InvestigationPanel
              investigation={investigation}
              buildId={build.id}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

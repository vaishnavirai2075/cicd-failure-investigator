"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { type BuildDetail, formatDuration } from "@/lib/data";
import { CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react";

const TABS = ["Overview", "Logs", "Tests"] as const;
type Tab = (typeof TABS)[number];

export function BuildTabs({ build }: { build: BuildDetail }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center gap-1 border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              tab === t
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "Overview" && <Overview build={build} />}
        {tab === "Logs" && <Logs build={build} />}
        {tab === "Tests" && <Tests build={build} />}
      </div>
    </div>
  );
}

function Overview({ build }: { build: BuildDetail }) {
  const meta = [
    { label: "Commit", value: build.commitMessage },
    { label: "Pipeline", value: build.pipeline, mono: true },
    { label: "Triggered by", value: build.triggeredBy, mono: true },
    { label: "Duration", value: formatDuration(build.durationSec), mono: true },
  ];
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </dt>
            <dd
              className={cn(
                "mt-1 text-sm text-foreground",
                m.mono && "font-mono text-xs",
              )}
            >
              {m.value || "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline Steps
        </h3>
        {build.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pipeline steps recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {build.steps.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
              >
                <StepIcon status={s.status} />
                <span className="text-sm font-medium text-foreground">
                  {s.name}
                </span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {s.status === "running"
                    ? "running…"
                    : formatDuration(s.durationSec)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: BuildDetail["steps"][number]["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2.25} />;
  if (status === "failed")
    return <XCircle className="h-4 w-4 text-danger" strokeWidth={2.25} />;
  return <Loader2 className="h-4 w-4 animate-spin text-info" strokeWidth={2.25} />;
}

function Logs({ build }: { build: BuildDetail }) {
  const color = {
    info: "text-muted-foreground",
    warn: "text-amber-400",
    error: "text-danger",
  };
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#08080d]">
      <div className="max-h-[28rem] overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {build.logs.length === 0 && (
          <p className="text-muted-foreground">No logs available.</p>
        )}
        {build.logs.map((l, idx) => (
          <div key={idx} className="flex gap-3 py-0.5">
            <span className="select-none text-muted-foreground/50">
              {l.time.slice(11, 19)}
            </span>
            <span className={cn("select-none uppercase", color[l.level])}>
              {l.level}
            </span>
            <span className={cn("flex-1", color[l.level])}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tests({ build }: { build: BuildDetail }) {
  const icon = {
    passed: <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2.25} />,
    failed: <XCircle className="h-4 w-4 text-danger" strokeWidth={2.25} />,
    skipped: <MinusCircle className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />,
  };
  const passed = build.tests.filter((t) => t.status === "passed").length;
  const failed = build.tests.filter((t) => t.status === "failed").length;
  const skipped = build.tests.filter((t) => t.status === "skipped").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-success">{passed} passed</span>
        <span className="text-danger">{failed} failed</span>
        <span className="text-muted-foreground">{skipped} skipped</span>
      </div>
      {build.tests.length === 0 && (
        <p className="text-sm text-muted-foreground">No test results recorded.</p>
      )}
      <div className="space-y-1.5">
        {build.tests.map((t, i) => (
          <div
            key={`${t.name}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
          >
            {icon[t.status]}
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-foreground">
                {t.name}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {t.suite}
              </p>
            </div>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {t.durationMs}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

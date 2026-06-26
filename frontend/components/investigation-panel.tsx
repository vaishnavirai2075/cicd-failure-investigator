"use client";

import { useState } from "react";
import { Sparkles, GitPullRequestArrow } from "lucide-react";
import type { Investigation } from "@/lib/data";
import { RootCauseBadge } from "@/components/root-cause-badge";
import { Markdown } from "@/components/markdown";
import { AgentTrace } from "@/components/agent-trace";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api";

export function InvestigationPanel({
  investigation,
  buildId,
}: {
  investigation: Investigation | null;
  buildId: string;
}) {
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  if (!investigation) {
    return (
      <div className="glass flex flex-col items-center gap-4 rounded-xl p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div>
          <p className="font-medium text-foreground">No investigation yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Trigger the AI agent to analyze this failure
          </p>
        </div>
        {triggered ? (
          <p className="text-sm text-success">
            ✓ Investigation triggered — refresh in a few seconds
          </p>
        ) : (
          <button
            onClick={async () => {
              setTriggering(true);
              try {
                await apiPost(`/investigations/${buildId}/trigger`);
                setTriggered(true);
              } finally {
                setTriggering(false);
              }
            }}
            disabled={triggering}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {triggering ? "Triggering…" : "Run AI Investigation"}
          </button>
        )}
      </div>
    );
  }

  const conf = investigation.confidence;
  const confColor =
    conf >= 90 ? "bg-success" : conf >= 75 ? "bg-primary" : "bg-amber-500";

  return (
    <div className="glass flex flex-col gap-5 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <h2 className="text-sm font-semibold">AI Investigation</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
          auto
        </span>
      </div>

      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Root Cause
          </span>
          <RootCauseBadge cause={investigation.rootCause} />
        </div>
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Confidence
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {conf}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className={cn("h-full rounded-full transition-all", confColor)}
              style={{ width: `${conf}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h3>
        <p className="text-sm leading-relaxed text-foreground/90">
          {investigation.summary}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <GitPullRequestArrow className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Proposed Fix
          </h3>
        </div>
        <Markdown content={investigation.proposedFixMarkdown} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reasoning Trace
        </h3>
        <AgentTrace trace={investigation.trace} />
      </div>
    </div>
  );
}

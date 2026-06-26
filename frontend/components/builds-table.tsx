import Link from "next/link";
import { ChevronRight, GitBranch } from "lucide-react";
import { type Build, formatDuration, timeAgo } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import { RootCauseBadge } from "@/components/root-cause-badge";
import { AuthorAvatar } from "@/components/author-avatar";

export function BuildsTable({ builds }: { builds: Build[] }) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Recent Builds</h2>
          <p className="text-xs text-muted-foreground">
            {builds.length} builds across all pipelines
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Build</th>
              <th className="px-5 py-3 font-medium">Repo / Branch</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Root Cause</th>
              <th className="px-5 py-3 font-medium">Author</th>
              <th className="px-5 py-3 text-right font-medium">Time</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {builds.map((b) => (
              <tr
                key={b.id}
                className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/builds/${b.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {b.id}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{b.repo}</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      {b.branch}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-5 py-3.5">
                  <RootCauseBadge cause={b.rootCause} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <AuthorAvatar name={b.author} />
                    <span className="text-foreground">{b.author}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-mono text-xs text-muted-foreground">
                    {timeAgo(b.createdAt)}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground/60">
                    {formatDuration(b.durationSec)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/builds/${b.id}`}
                    aria-label={`Investigate ${b.id}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

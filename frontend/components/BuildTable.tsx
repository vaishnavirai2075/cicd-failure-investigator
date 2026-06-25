"use client";
import BuildStatusBadge from "./BuildStatusBadge";
import RootCauseBadge from "./RootCauseBadge";

export interface BuildRow {
  build_id: string;
  repo: string;
  branch: string;
  status: string;
  author: string;
  duration_sec: number | null;
  created_at: string;
  root_cause?: string;
}

interface BuildTableProps {
  builds: BuildRow[];
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-surface-hover rounded animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function BuildTable({ builds, loading = false }: BuildTableProps) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Build
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Repo / Branch
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Root Cause
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Author
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : builds.map((build) => (
                  <tr
                    key={build.build_id}
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/builds/${build.build_id}`)
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-accent">
                        {build.build_id.slice(0, 16)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-text-primary text-xs font-medium">
                          {build.repo}
                        </span>
                        <span className="text-text-muted text-xs font-mono">
                          {build.branch}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <BuildStatusBadge status={build.status} />
                    </td>
                    <td className="px-4 py-3">
                      {build.root_cause ? (
                        <RootCauseBadge cause={build.root_cause} />
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {build.author}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs font-mono">
                      {build.duration_sec ? `${build.duration_sec}s` : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
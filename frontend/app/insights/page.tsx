import { BarChart3, Sparkles, TrendingUp } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { RootCauseBadge } from "@/components/root-cause-badge";
import { mapRootCause, type OverviewStats, type RootCause } from "@/lib/data";
import { apiFetch } from "@/lib/api";

async function getInsights() {
  const [statsRes, invRes] = await Promise.allSettled([
    apiFetch<OverviewStats>("/builds/stats/overview"),
    apiFetch<Record<string, unknown>[]>("/investigations?limit=50"),
  ]);

  const overview =
    statsRes.status === "fulfilled"
      ? statsRes.value
      : {
          total_builds: 0,
          success_builds: 0,
          failed_builds: 0,
          success_rate: 0,
          avg_duration_sec: 0,
          open_investigations: 0,
        };

  const investigations = invRes.status === "fulfilled" ? invRes.value : [];

  const causeCounts: Record<string, number> = {};
  for (const inv of investigations) {
    const cause = mapRootCause(inv.root_cause as string);
    if (cause !== "None") causeCounts[cause] = (causeCounts[cause] ?? 0) + 1;
  }

  const topCauses = Object.entries(causeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { overview, topCauses, investigationCount: investigations.length };
}

export default async function InsightsPage() {
  const { overview, topCauses, investigationCount } = await getInsights();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Failure patterns and investigation coverage across pipelines.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Investigations Run"
            value={investigationCount.toString()}
            Icon={Sparkles}
            accent="text-primary"
          />
          <StatCard
            label="Open Investigations"
            value={overview.open_investigations.toString()}
            Icon={BarChart3}
            accent="text-info"
          />
          <StatCard
            label="Success Rate"
            value={overview.success_rate.toFixed(1)}
            unit="%"
            Icon={TrendingUp}
            accent="text-success"
          />
        </section>

        <section className="mt-6 glass rounded-xl p-5">
          <h2 className="text-sm font-semibold">Top Root Causes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Most frequent failure categories from AI investigations
          </p>

          {topCauses.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No completed investigations yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {topCauses.map(([cause, count]) => (
                <div key={cause} className="flex items-center gap-4">
                  <RootCauseBadge cause={cause as RootCause} />
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-accent">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.round((count / topCauses[0][1]) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

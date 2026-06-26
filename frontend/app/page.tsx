import { Activity, CheckCircle2, XCircle, Timer } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { BuildsTable } from "@/components/builds-table";
import {
  mapBuild,
  mapDailyStats,
  computeTrendDeltas,
  formatDuration,
  type Build,
  type DailyStat,
  type OverviewStats,
} from "@/lib/data";
import { apiFetch } from "@/lib/api";

async function getData() {
  const [rawBuilds, statsRes, dailyRes, invRes] = await Promise.allSettled([
    apiFetch<unknown[]>("/builds"),
    apiFetch<OverviewStats>("/builds/stats/overview"),
    apiFetch<{ date: string; success: number; failure: number }[]>(
      "/builds/stats/daily?days=14",
    ),
    apiFetch<Record<string, unknown>[]>("/investigations"),
  ]);

  let buildArr: Record<string, unknown>[] = [];
  if (rawBuilds.status === "fulfilled") {
    const val = rawBuilds.value as
      | Record<string, unknown>[]
      | { builds: Record<string, unknown>[] };
    buildArr = Array.isArray(val)
      ? val
      : ((val as { builds: Record<string, unknown>[] }).builds ?? []);
  }

  const invMap: Record<string, string> = {};
  if (invRes.status === "fulfilled") {
    for (const inv of invRes.value) {
      invMap[inv.build_id as string] = inv.root_cause as string;
    }
  }

  const builds: Build[] = buildArr.slice(0, 50).map((b) => mapBuild(b, invMap));

  const overview: OverviewStats =
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

  const dailyRaw = dailyRes.status === "fulfilled" ? dailyRes.value : [];
  const dailyTrend: DailyStat[] = mapDailyStats(
    Array.isArray(dailyRaw) ? dailyRaw : [],
  );
  const trends = computeTrendDeltas(dailyTrend);

  return { builds, overview, dailyTrend, trends };
}

export default async function DashboardPage() {
  const { builds, overview, dailyTrend, trends } = await getData();
  const successRate = overview.success_rate.toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Failure Investigator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-assisted root cause analysis across your CI/CD pipelines.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Builds"
            value={overview.total_builds.toLocaleString()}
            Icon={Activity}
            accent="text-primary"
            delta={trends.totalBuilds.delta}
            deltaPositive={trends.totalBuilds.positive}
          />
          <StatCard
            label="Success Rate"
            value={successRate}
            unit="%"
            Icon={CheckCircle2}
            accent="text-success"
            delta={trends.successRate.delta}
            deltaPositive={trends.successRate.positive}
          />
          <StatCard
            label="Failed Builds"
            value={overview.failed_builds.toString()}
            Icon={XCircle}
            accent="text-danger"
            delta={trends.failedBuilds.delta}
            deltaPositive={trends.failedBuilds.increased}
            deltaVariant="danger"
          />
          <StatCard
            label="Avg Duration"
            value={formatDuration(Math.round(overview.avg_duration_sec))}
            Icon={Timer}
            accent="text-info"
          />
        </section>

        <section className="mt-6 glass rounded-xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Build Outcomes</h2>
              <p className="text-xs text-muted-foreground">
                Daily success vs failure over the last 14 days
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-success" /> Success
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-danger" /> Failed
              </span>
            </div>
          </div>
          <TrendChart data={dailyTrend} />
        </section>

        <section className="mt-6">
          <BuildsTable builds={builds} />
        </section>
      </main>
    </div>
  );
}

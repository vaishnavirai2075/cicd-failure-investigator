import { TopNav } from "@/components/top-nav";
import { BuildsTable } from "@/components/builds-table";
import { mapBuild, type Build } from "@/lib/data";
import { apiFetch } from "@/lib/api";

async function getBuilds() {
  const [rawBuilds, invRes] = await Promise.allSettled([
    apiFetch<unknown[]>("/builds"),
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

  return buildArr.map((b) => mapBuild(b, invMap)) as Build[];
}

export default async function PipelinesPage() {
  const builds = await getBuilds();
  const repos = [...new Set(builds.map((b) => b.repo))];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Pipelines
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repos.length} repositories · {builds.length} recent builds
          </p>
        </div>
        <BuildsTable builds={builds} />
      </main>
    </div>
  );
}

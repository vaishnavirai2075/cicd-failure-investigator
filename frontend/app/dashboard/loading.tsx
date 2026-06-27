export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-secondary/60" />
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6 h-72 rounded-xl bg-secondary/60" />

      {/* Table rows */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-secondary/60" />
        ))}
      </div>
    </div>
  );
}
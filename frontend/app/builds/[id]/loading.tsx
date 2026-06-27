export default function BuildDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-64 rounded-xl bg-secondary/60" />
        <div className="h-4 w-96 rounded-xl bg-secondary/60" />
      </div>

      {/* Two-column content */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-96 rounded-xl bg-secondary/60 lg:col-span-3" />
        <div className="h-96 rounded-xl bg-secondary/60 lg:col-span-2" />
      </div>
    </div>
  );
}
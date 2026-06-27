import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass rounded-xl p-12 text-center max-w-sm w-full">
        <p className="font-mono text-6xl font-bold text-primary">404</p>
        <p className="mt-4 text-sm font-medium text-foreground">
          Build not found
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The page you're looking for doesn't exist or was removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
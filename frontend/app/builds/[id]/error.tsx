"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function BuildDetailError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="glass rounded-xl p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mx-auto mb-4">
          <AlertTriangle className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-sm font-medium text-foreground">
          Failed to load build
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
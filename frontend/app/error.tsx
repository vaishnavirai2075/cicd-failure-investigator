"use client";

import { useEffect } from "react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function GlobalError({
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <ErrorBoundary>
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Something went wrong
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
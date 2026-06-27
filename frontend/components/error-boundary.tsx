"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="glass rounded-xl p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mx-auto mb-4">
              <AlertTriangle className="h-6 w-6" strokeWidth={2} />
            </span>
            <p className="text-sm font-medium text-foreground">
              Something went wrong
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {this.state.error.message}
            </p>
            <button
              onClick={this.reset}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
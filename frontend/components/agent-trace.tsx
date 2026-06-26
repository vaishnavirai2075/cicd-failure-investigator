"use client";

import { useEffect, useState } from "react";

export function AgentTrace({ trace }: { trace: string[] }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= trace.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 420);
    return () => clearTimeout(t);
  }, [visible, trace.length]);

  const done = visible >= trace.length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#08080d]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
          agent — reasoning trace
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {trace.slice(0, visible).map((line, idx) => {
          const [head, ...rest] = line.split(": ");
          const body = rest.join(": ");
          return (
            <div key={idx} className="flex gap-2 py-0.5">
              <span className="select-none text-primary/70">›</span>
              <span>
                <span className="text-primary">{head}</span>
                {body && <span className="text-muted-foreground">: {body}</span>}
              </span>
            </div>
          );
        })}
        <div className="flex gap-2 py-0.5">
          <span className="select-none text-primary/70">›</span>
          {done ? (
            <span className="text-success">
              analysis complete
              <span className="cursor-blink ml-0.5 inline-block">▋</span>
            </span>
          ) : (
            <span className="cursor-blink inline-block text-foreground">▋</span>
          )}
        </div>
      </div>
    </div>
  );
}

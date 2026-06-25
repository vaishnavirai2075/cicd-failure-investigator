"use client";
import { useEffect, useRef, useState } from "react";
import { Terminal, ChevronDown } from "lucide-react";

export interface TerminalLine {
  type: "system" | "tool_call" | "tool_result" | "reasoning" | "result" | "error";
  content: string;
  timestamp?: string;
}

interface TerminalPanelProps {
  lines: TerminalLine[];
  title?: string;
  isRunning?: boolean;
  maxHeight?: string;
}

const LINE_STYLES: Record<TerminalLine["type"], string> = {
  system:      "text-text-muted",
  tool_call:   "text-accent font-semibold",
  tool_result: "text-text-primary",
  reasoning:   "text-warning",
  result:      "text-success font-semibold",
  error:       "text-danger",
};

const LINE_PREFIXES: Record<TerminalLine["type"], string> = {
  system:      "  ",
  tool_call:   "▶ ",
  tool_result: "  ",
  reasoning:   "~ ",
  result:      "✓ ",
  error:       "✗ ",
};

export default function TerminalPanel({
  lines,
  title = "Agent Reasoning Trace",
  isRunning = false,
  maxHeight = "420px",
}: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  return (
    <div className="bg-[#0D0D14] border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-muted font-mono">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              running
            </span>
          )}
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
            >
              <ChevronDown size={12} />
              scroll to bottom
            </button>
          )}
          {/* Traffic lights */}
          <div className="flex gap-1.5 ml-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto font-mono text-xs leading-relaxed p-4 flex flex-col gap-0.5"
        style={{ maxHeight }}
      >
        {lines.length === 0 && !isRunning && (
          <span className="text-text-muted">
            No trace available yet. Trigger an investigation to see the agent reasoning.
          </span>
        )}

        {lines.map((line, i) => (
          <div key={i} className={`flex gap-2 ${LINE_STYLES[line.type]}`}>
            <span className="shrink-0 select-none opacity-60">
              {LINE_PREFIXES[line.type]}
            </span>
            <span className="whitespace-pre-wrap break-all">{line.content}</span>
          </div>
        ))}

        {/* Blinking cursor */}
        {isRunning && (
          <div className="flex gap-2 text-accent mt-1">
            <span className="shrink-0 select-none">▶</span>
            <span className="animate-pulse">▋</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
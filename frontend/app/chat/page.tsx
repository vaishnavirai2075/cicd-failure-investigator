"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, Loader2, MessageSquare, Send } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { StatusBadge } from "@/components/status-badge";
import { Markdown } from "@/components/markdown";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BuildSummary {
  build_id: string;
  repo: string;
  branch: string;
  status: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function mapStatus(s: string): "failed" | "running" | "success" {
  if (s === "failure") return "failed";
  if (s === "in_progress") return "running";
  return "success";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ChatPage() {
  const [builds, setBuilds] = useState<BuildSummary[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(true);
  const [selectedBuild, setSelectedBuild] = useState<BuildSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch sidebar builds
  useEffect(() => {
    fetch(`${API_BASE}/chat/builds`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setBuilds)
      .catch(() => setBuilds([]))
      .finally(() => setBuildsLoading(false));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 96) + "px";
  }, [input]);

  const selectBuild = (b: BuildSummary) => {
    setSelectedBuild(b);
    const repo = b.repo.split("/").pop() ?? b.repo;
    setMessages([
      {
        role: "user",
        content: `Investigate build ${b.build_id} — repo: ${repo}, branch: ${b.branch}, status: ${b.status === "failure" ? "failed" : b.status}`,
      },
    ]);
    setInput("");
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming || !selectedBuild) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          build_id: selectedBuild.build_id,
          messages: newMessages,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            setStreaming(false);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + parsed.content },
                  ];
                }
                return [...prev, { role: "assistant", content: parsed.content }];
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Build Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a build and chat with the AI agent about the failure.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left Sidebar */}
          <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Recent Builds
            </p>

            {buildsLoading ? (
              <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : builds.length === 0 ? (
              <div className="glass rounded-xl p-5 text-center">
                <p className="text-sm text-muted-foreground">No builds found.</p>
              </div>
            ) : (
              builds.map((b) => {
                const repo = b.repo.split("/").pop() ?? b.repo;
                const active = selectedBuild?.build_id === b.build_id;
                return (
                  <button
                    key={b.build_id}
                    onClick={() => selectBuild(b)}
                    className={cn(
                      "glass rounded-xl p-3.5 text-left transition-all hover:border-primary/30 w-full",
                      active && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs text-primary truncate">
                        {b.build_id}
                      </span>
                      <StatusBadge status={mapStatus(b.status)} />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{repo}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        {b.branch}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(b.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Chat Panel */}
          <div className="flex flex-1 flex-col glass rounded-xl overflow-hidden">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!selectedBuild ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mx-auto">
                      <MessageSquare className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      Select a build to start investigating
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose a build from the sidebar to chat with the AI agent
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) =>
                    msg.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary/15 px-4 py-3 text-sm text-foreground">
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex justify-start">
                        <div className="glass max-w-[80%] rounded-xl rounded-tl-sm px-4 py-3 text-sm">
                          <Markdown content={msg.content} />
                        </div>
                      </div>
                    )
                  )}

                  {/* Typing indicator — shown while streaming before first assistant chunk */}
                  {streaming &&
                    (messages[messages.length - 1]?.role !== "assistant") && (
                      <div className="flex justify-start">
                        <div className="glass rounded-xl rounded-tl-sm px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse"
                                style={{ animationDelay: `${i * 150}ms` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-border p-4">
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!selectedBuild || streaming}
                  placeholder={
                    !selectedBuild
                      ? "Select a build to start chatting…"
                      : "Ask about this build failure… (Enter to send)"
                  }
                  className="flex-1 resize-none rounded-lg border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans leading-relaxed"
                />
                <button
                  onClick={sendMessage}
                  disabled={!selectedBuild || streaming || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Shift+Enter for new line · Enter to send
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
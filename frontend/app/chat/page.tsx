import { MessageSquare } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto flex max-w-7xl items-center justify-center px-6 py-24">
        <div className="glass w-full max-w-md rounded-xl p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MessageSquare className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">Chat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Streaming AI chat with build context coming next.
          </p>
        </div>
      </main>
    </div>
  );
}

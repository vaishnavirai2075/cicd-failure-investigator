import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CI/CD Failure Investigator",
  description: "AI-powered CI/CD failure analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary min-h-screen">
        <nav className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold font-mono">CI</span>
            </div>
            <span className="font-semibold text-text-primary tracking-tight">
              CI/CD Investigator
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/chat">Chat</NavLink>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-53px)]">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
    >
      {children}
    </a>
  );
}
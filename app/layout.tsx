import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electrical Master — AI Costing & Quotation",
  description: "Internal costing and quotation tool for Electrical Master Switchgear",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col bg-background">
        {children}
      </main>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 min-w-[256px] bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen overflow-y-auto select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-sm font-bold text-base">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold tracking-wider uppercase text-foreground truncate">
              ELECTRICAL MASTER
            </div>
            <div className="text-[11px] text-muted font-medium truncate">
              AI Costing & Estimation
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <SidebarNav />

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Storage: IndexedDB
          </span>
          <span className="font-semibold text-foreground/50">v1.2</span>
        </div>
      </div>
    </aside>
  );
}

// We need client component for active state
import { SidebarNav } from "@/components/layout/SidebarNav";

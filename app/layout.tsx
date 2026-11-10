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
    <aside className="w-[235px] min-w-[235px] bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen overflow-y-auto select-none shadow-[1px_0_3px_0_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-xs tracking-wider uppercase">
          <span>⚡</span>
          <span>ELECTRICAL MASTER</span>
        </div>
        <div className="text-[11px] text-muted font-medium mt-0.5">
          AI Costing Tool
        </div>
      </div>

      {/* Nav Links */}
      <SidebarNav />

      {/* Footer */}
      <div className="mt-auto px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
              N
            </span>
            <span>MVP v1.0</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            IndexedDB
          </span>
        </div>
      </div>
    </aside>
  );
}

// We need client component for active state
import { SidebarNav } from "@/components/layout/SidebarNav";

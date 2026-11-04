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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", borderTop: "3px solid var(--accent)" }}>
        {children}
      </main>
    </div>
  );
}

function Sidebar() {
  // We import NavLink client component from a separate file
  // But since layout.tsx can be server component, we keep sidebar as server HTML
  // and use client links for active state
  return (
    <nav
      style={{
        width: "220px",
        minWidth: "220px",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        borderTop: "3px solid var(--danger)", /* Explicit red element */
        display: "flex",
        flexDirection: "column",
        padding: "0",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--danger)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "2px" }}>
          ⚡ ELECTRICAL MASTER
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          AI Costing Tool
        </div>
      </div>

      {/* Nav Links */}
      <SidebarNav />

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid var(--sidebar-border)" }}>
        <div style={{ fontSize: "10px", color: "var(--muted)", textAlign: "center" }}>
          MVP v1.0 · Session Only
        </div>
      </div>
    </nav>
  );
}

// We need client component for active state
import { SidebarNav } from "@/components/layout/SidebarNav";

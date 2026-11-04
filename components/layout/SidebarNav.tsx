"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: "▦" },
    { href: "/blind-quotation", label: "Blind Quotation", icon: "⚡" },
    { href: "/price-lists", label: "Price Lists", icon: "📋" },
    { href: "/costing", label: "New Costing", icon: "🧮" },
    { href: "/import-boq", label: "Import BOQ", icon: "📥" },
    { href: "/templates", label: "Templates", icon: "📄" },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <div style={{ padding: "12px 8px", flex: 1 }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 8px 4px", marginBottom: "4px" }}>
                Navigation
            </div>
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            marginBottom: "2px",
                            fontSize: "13px",
                            fontWeight: isActive ? 600 : 400,
                            background: isActive ? "var(--accent-subtle)" : "transparent",
                            color: isActive ? "var(--accent)" : "var(--foreground)",
                            borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                            transition: "all 0.15s",
                            textDecoration: "none",
                        }}
                    >
                        <span style={{ fontSize: "14px" }}>{item.icon}</span>
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}

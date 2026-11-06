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
        <nav className="p-2 flex-1 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted font-bold px-3 py-2">
                Navigation
            </div>
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all duration-150 ${
                            isActive
                                ? "bg-blue-50 text-blue-700 font-semibold shadow-2xs"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                        }`}
                    >
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

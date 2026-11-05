"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Zap,
    FileSpreadsheet,
    Calculator,
    FileUp,
    FileText,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/blind-quotation", label: "Blind Quotation", icon: Zap },
    { href: "/price-lists", label: "Price Lists", icon: FileSpreadsheet },
    { href: "/costing", label: "New Costing", icon: Calculator },
    { href: "/import-boq", label: "Import BOQ", icon: FileUp },
    { href: "/templates", label: "Templates", icon: FileText },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="p-3 flex-1 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted font-bold px-3 py-1 mb-1">
                Navigation
            </div>
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                            isActive
                                ? "bg-accent/10 text-accent font-semibold shadow-xs"
                                : "text-foreground/80 hover:bg-muted-bg hover:text-foreground font-medium"
                        }`}
                    >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : "text-muted"}`} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

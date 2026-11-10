"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Zap,
    FileSpreadsheet,
    Calculator,
    Upload,
    FileCode,
} from "lucide-react";

interface NavItem {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/blind-quotation", label: "Blind Quotation", icon: Zap },
    { href: "/price-lists", label: "Price Lists", icon: FileSpreadsheet },
    { href: "/costing", label: "New Costing", icon: Calculator },
    { href: "/import-boq", label: "Import BOQ", icon: Upload },
    { href: "/templates", label: "Templates", icon: FileCode },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 min-w-[256px] bg-white dark:bg-[#121212] border-r border-[#e5e5e5] dark:border-[#262626] flex flex-col h-screen select-none shrink-0 text-neutral-800 dark:text-neutral-200">
            {/* Logo Area */}
            <div className="px-5 py-5 border-b border-[#f0f0f0] dark:border-[#262626]">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 shadow-xs">
                        <Zap className="h-4 w-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold tracking-wider text-neutral-900 dark:text-white uppercase truncate">
                            ELECTRICAL MASTER
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                            AI Costing & Quotation
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2">
                    Navigation
                </div>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon
                                    className={`h-4 w-4 shrink-0 transition-colors ${
                                        isActive ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"
                                    }`}
                                />
                                <span>{item.label}</span>
                            </div>
                            {isActive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Footer with Version & IndexedDB Status Badge */}
            <div className="p-4 border-t border-[#f0f0f0] dark:border-[#262626] bg-[#fafafa]/50 dark:bg-[#121212]/50">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-900 text-[10px] font-bold text-white">
                            N
                        </span>
                        <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            MVP v1.0
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>IndexedDB</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

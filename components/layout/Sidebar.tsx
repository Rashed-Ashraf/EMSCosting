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
        <nav className="w-64 min-w-[256px] h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col select-none shrink-0">
            {/* Logo */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                        <span className="text-white font-bold text-sm">⚡</span>
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                            Electrical Master
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                            AI Costing Tool
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider px-3 py-2">
                    Navigation
                </div>

                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>MVP v1.0 · IndexedDB</span>
                </div>
            </div>
        </nav>
    );
}

export default Sidebar;

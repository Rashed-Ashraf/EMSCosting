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
        <aside className="w-64 min-w-[256px] bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0 text-slate-300">
            {/* Logo Area with subtle gradient border effect */}
            <div className="px-5 py-5 border-b border-slate-800 relative">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-rose-600 to-amber-500 text-white shadow-md shadow-red-500/20">
                        <Zap className="h-5 w-5 fill-current" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-extrabold tracking-wider text-white uppercase truncate">
                            ELECTRICAL MASTER
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                            AI Costing & Quotation
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">
                    Navigation
                </div>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                                isActive
                                    ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-600"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon
                                    className={`h-4 w-4 shrink-0 transition-colors ${
                                        isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                                    }`}
                                />
                                <span>{item.label}</span>
                            </div>
                            {isActive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Footer with Version & IndexedDB Status Badge */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                            N
                        </span>
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded-full font-medium">
                            MVP v1.0
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>IndexedDB</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

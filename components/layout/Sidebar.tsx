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
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4 text-[#1d4ed8]" /> },
    { href: "/blind-quotation", label: "Blind Quotation", icon: <span className="text-sm">⚡</span> },
    { href: "/price-lists", label: "Price Lists", icon: <span className="text-sm">📋</span> },
    { href: "/costing", label: "New Costing", icon: <span className="text-sm">🧮</span> },
    { href: "/import-boq", label: "Import BOQ", icon: <span className="text-sm">📥</span> },
    { href: "/templates", label: "Templates", icon: <span className="text-sm">📄</span> },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <nav className="w-56 min-w-[224px] h-screen bg-white border-r border-[#e2e8f0] border-t-[3px] border-[#dc2626] flex flex-col select-none shrink-0">
            {/* Logo Area */}
            <div className="p-5 border-b border-[#e2e8f0]">
                <div className="text-[11px] font-bold text-[#dc2626] tracking-[0.12em] uppercase mb-0.5">
                    ⚡ ELECTRICAL MASTER
                </div>
                <div className="text-xs text-[#64748b]">
                    AI Costing Tool
                </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.08em] px-3 pt-2 pb-2">
                    NAVIGATION
                </div>

                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                isActive
                                    ? "bg-[#eff6ff] text-[#1d4ed8] font-semibold border-l-2 border-[#1d4ed8]"
                                    : "text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] font-normal"
                            }`}
                        >
                            <span className="w-4 h-4 flex items-center justify-center shrink-0">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#e2e8f0] mt-auto">
                <div className="flex items-center gap-2 text-xs text-[#64748b]">
                    <div className="w-6 h-6 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        N
                    </div>
                    <span className="text-[11px] font-medium text-[#64748b]">MVP v1.0 · Session Only</span>
                </div>
            </div>
        </nav>
    );
}

export default Sidebar;

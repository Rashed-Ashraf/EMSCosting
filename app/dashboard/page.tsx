"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { QuickAction } from "@/components/ui/QuickAction";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;
    const totals = costingSession?.totals;

    return (
        <div className="min-h-full bg-[#f8fafc] p-6 sm:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0f172a] flex items-center gap-2 tracking-tight">
                            <span className="text-amber-500">⚡</span> Dashboard
                        </h1>
                        <p className="text-xs text-[#64748b] mt-1">
                            Electrical Master — AI Costing & Quotation Tool
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/costing"
                            className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                        >
                            <span>🧮</span>
                            <span>New Costing</span>
                        </Link>
                        <Link
                            href="/price-lists"
                            className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#e2e8f0] text-[#1e293b] text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                        >
                            <span>📋</span>
                            <span>Upload Price List</span>
                        </Link>
                    </div>
                </div>

                {/* Active Session Warning Banner */}
                {costingItemCount > 0 && (
                    <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <p className="text-xs sm:text-sm font-semibold text-amber-900">
                                    You have an active costing session with {costingItemCount} item{costingItemCount !== 1 ? "s" : ""}.
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Download your files before starting a new costing.
                                </p>
                            </div>
                        </div>
                        <Link href="/costing" className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0">
                            View Session →
                        </Link>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <StatCard
                        label="Products Indexed"
                        value={products.length.toLocaleString()}
                        subtitle={`${loadedBrands.length} brand${loadedBrands.length !== 1 ? "s" : ""} loaded`}
                    />
                    <StatCard
                        label="Price Lists"
                        value={priceLists.length.toString()}
                        subtitle={`${priceLists.filter((pl) => pl.status === "ready").length} active`}
                    />
                    <StatCard
                        label="Costing Items"
                        value={costingItemCount.toString()}
                        subtitle={costingItemCount > 0 ? "Active estimation in progress" : "No active session"}
                    />
                    <StatCard
                        label="BOQ Matches"
                        value={boqMatches.length.toString()}
                        subtitle={`${boqMatches.filter((m) => m.status === "accepted").length} accepted`}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Session Data */}
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-2xs">
                        <h2 className="text-base font-bold text-[#1e293b] flex items-center gap-2 mb-6">
                            <span>📡</span>
                            <span>Session Data</span>
                        </h2>

                        <div>
                            <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2.5">
                                LOADED BRANDS
                            </div>
                            {loadedBrands.length === 0 ? (
                                <div className="text-xs text-[#64748b]">
                                    No price lists loaded.{" "}
                                    <Link href="/price-lists" className="text-[#1d4ed8] hover:underline font-medium">
                                        Upload one now →
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {loadedBrands.map((brand) => (
                                        <span
                                            key={brand}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eff6ff] text-[#1d4ed8] text-xs font-semibold rounded-lg border border-[#bfdbfe]"
                                        >
                                            <span>⚡</span>
                                            <span>{brand}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
                            <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2.5">
                                PRICE LIST STATUS
                            </div>
                            {priceLists.length === 0 ? (
                                <div className="text-xs text-[#64748b]">
                                    No price lists.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {priceLists.map((pl) => (
                                        <div key={pl.id} className="flex items-center justify-between p-2.5 bg-[#f8fafc] rounded-lg border border-[#f1f5f9]">
                                            <div className="min-w-0 pr-2">
                                                <div className="text-xs font-semibold text-[#1e293b] truncate">{pl.brand}</div>
                                                <div className="text-[11px] text-[#64748b] truncate">{pl.fileName} · {pl.productCount ?? 0} items</div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                                                pl.status === "ready"
                                                    ? "bg-[#ecfdf5] text-[#16a34a] border border-[#a7f3d0]"
                                                    : pl.status === "error"
                                                    ? "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]"
                                                    : "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    pl.status === "ready" ? "bg-[#16a34a]" : pl.status === "error" ? "bg-[#dc2626]" : "bg-[#d97706]"
                                                }`} />
                                                <span className="capitalize">{pl.status}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Quick Actions */}
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-2xs">
                        <h2 className="text-base font-bold text-[#1e293b] flex items-center gap-2 mb-4">
                            <span>🚀</span>
                            <span>Quick Actions</span>
                        </h2>

                        <div>
                            <QuickAction
                                icon="📋"
                                title="Upload Price List"
                                description="Add Schneider, ABB, Siemens, or other brand price lists"
                                href="/price-lists"
                            />
                            <QuickAction
                                icon="🧮"
                                title="New Costing"
                                description="Search products, set quantities, and calculate costs"
                                href="/costing"
                            />
                            <QuickAction
                                icon="📥"
                                title="Import BOQ"
                                description="Upload a customer BOQ and auto-match products"
                                href="/import-boq"
                            />
                            <QuickAction
                                icon="📄"
                                title="Manage Templates"
                                description="Upload your Excel costing/quotation templates"
                                href="/templates"
                            />
                            <QuickAction
                                icon="⚡"
                                title="Blind Quotation Finder"
                                description="Search models by electrical readings (Amps, Poles, kA) & brand"
                                href="/blind-quotation"
                            />
                        </div>

                        {/* Current Costing Summary if active */}
                        {costingSession && costingItemCount > 0 && (
                            <div className="mt-5 pt-5 border-t border-[#f1f5f9]">
                                <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                                    CURRENT COSTING
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-[#1e293b]">
                                            {costingSession.header.customerName || "Unnamed Customer"}
                                        </div>
                                        <div className="text-xs text-[#64748b]">
                                            {costingSession.header.project || "No project name"}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-[#1d4ed8]">
                                            PKR {totals?.grandTotal?.toLocaleString("en-PK") ?? 0}
                                        </div>
                                        <div className="text-[11px] text-[#64748b]">
                                            {costingItemCount} items incl. GST
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href="/costing"
                                    className="w-full mt-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <span>Continue Costing →</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

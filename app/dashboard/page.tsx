"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;
    const currency = costingSession?.header.currency || "PKR";
    const readyPriceLists = priceLists.filter((pl) => pl.status === "ready").length;
    const acceptedBoqMatches = boqMatches.filter((m) => m.status === "accepted").length;

    return (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>⚡</span>
                        <span>Dashboard</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted mt-1">
                        Electrical Master — AI Costing, OCR & Quotation Tool
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link href="/costing" className="btn-primary">
                        <span>🧮</span>
                        <span>New Costing</span>
                    </Link>
                    <Link href="/price-lists" className="btn-secondary">
                        <span>📋</span>
                        <span>Upload Price List</span>
                    </Link>
                </div>
            </div>

            {/* Active Session Warning Banner */}
            {costingItemCount > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">⚠️</span>
                        <span>
                            You have an active costing session with <strong>{costingItemCount} item{costingItemCount !== 1 ? "s" : ""}</strong>. Download your files before starting a new costing.
                        </span>
                    </div>
                    <Link
                        href="/costing"
                        className="font-bold text-amber-700 hover:text-amber-900 hover:underline shrink-0 text-xs sm:text-sm"
                    >
                        View Session →
                    </Link>
                </div>
            )}

            {/* Unified 4-Metric Stats Bar */}
            <div className="card p-0 overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border shadow-xs">
                <div className="p-5 flex flex-col gap-1">
                    <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                        {products.length.toLocaleString()}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Products Indexed</div>
                    <div className="text-[11px] text-muted">
                        {loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} loaded
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-1">
                    <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                        {priceLists.length}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Price Lists</div>
                    <div className="text-[11px] text-muted">
                        {readyPriceLists} active catalog{readyPriceLists !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-1">
                    <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                        {costingItemCount}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Costing Items</div>
                    <div className="text-[11px] text-muted">
                        {costingSession ? "Active estimation in progress" : "No active session"}
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-1">
                    <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                        {boqMatches.length}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">BOQ Items Processed</div>
                    <div className="text-[11px] text-muted">
                        {acceptedBoqMatches} accepted match{acceptedBoqMatches !== 1 ? "es" : ""}
                    </div>
                </div>
            </div>

            {/* Split Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Catalogs & Brands */}
                <div className="card space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <span>📦</span>
                        <span>CATALOGS & BRANDS</span>
                    </h2>

                    {/* Loaded Brands */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                            Loaded Brands
                        </div>
                        {loadedBrands.length === 0 ? (
                            <div className="text-xs text-muted py-1">
                                No price lists loaded.{" "}
                                <Link href="/price-lists" className="text-accent hover:underline font-medium">
                                    Upload one now →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {loadedBrands.map((brand) => (
                                    <span
                                        key={brand}
                                        className="badge badge-blue font-bold px-3 py-1 text-xs"
                                    >
                                        <span>⚡</span>
                                        <span>{brand}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Price List Status */}
                    <div className="pt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                            Price List Status
                        </div>
                        {priceLists.length === 0 ? (
                            <div className="text-xs text-muted py-2">
                                No catalog files uploaded yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-bold text-foreground shrink-0">
                                                {pl.brand}
                                            </span>
                                            <span className="text-muted truncate">
                                                {pl.fileName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <span className="text-muted text-[11px]">
                                                {pl.productCount ?? 0} items
                                            </span>
                                            <span
                                                className={`badge ${
                                                    pl.status === "ready"
                                                        ? "badge-green"
                                                        : pl.status === "error"
                                                        ? "badge-red"
                                                        : "badge-yellow"
                                                }`}
                                            >
                                                {pl.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Quick Actions & Current Costing */}
                <div className="card space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <span>🚀</span>
                        <span>QUICK ACTIONS</span>
                    </h2>

                    <div className="divide-y divide-border/60">
                        <QuickActionRow
                            href="/blind-quotation"
                            icon="⚡"
                            title="Blind Quotation Finder"
                            desc="Search models by electrical readings (Amps, Poles, kA) & brand"
                        />
                        <QuickActionRow
                            href="/price-lists"
                            icon="📋"
                            title="Upload Price List"
                            desc="Add Schneider, ABB, Siemens, or other brand price lists"
                        />
                        <QuickActionRow
                            href="/costing"
                            icon="🧮"
                            title="New Costing"
                            desc="Search products, set quantities, and calculate costs"
                        />
                        <QuickActionRow
                            href="/import-boq"
                            icon="📥"
                            title="Import BOQ"
                            desc="Upload a customer BOQ and auto-match products"
                        />
                        <QuickActionRow
                            href="/templates"
                            icon="📄"
                            title="Manage Templates"
                            desc="Upload your Excel costing/quotation templates"
                        />
                    </div>

                    {/* Current Costing Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <div className="pt-3 border-t border-border">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                                CURRENT COSTING
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-foreground truncate">
                                        {costingSession.header.customerName || "Unnamed Customer"}
                                    </div>
                                    <div className="text-xs text-muted truncate mt-0.5">
                                        {costingSession.header.project || "No project name"}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-extrabold text-blue-600 text-lg">
                                        {currency} {new Intl.NumberFormat().format(costingSession.totals.grandTotal)}
                                    </div>
                                    <div className="text-[11px] text-muted">
                                        {costingItemCount} items incl. GST
                                    </div>
                                </div>
                            </div>
                            <Link
                                href="/costing"
                                className="btn-primary w-full justify-center text-xs sm:text-sm py-2.5 mt-3 shadow-sm"
                            >
                                Continue Costing →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickActionRow({
    href,
    icon,
    title,
    desc,
}: {
    href: string;
    icon: string;
    title: string;
    desc: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors text-foreground"
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">
                    {icon}
                </span>
                <div className="min-w-0">
                    <div className="font-semibold text-xs text-foreground group-hover:text-blue-600 transition-colors">
                        {title}
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5">{desc}</div>
                </div>
            </div>
            <span className="text-muted/60 group-hover:text-blue-600 group-hover:translate-x-1 transition-all text-xs font-bold shrink-0 ml-2">
                →
            </span>
        </Link>
    );
}

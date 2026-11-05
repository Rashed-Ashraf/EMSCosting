"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;

    return (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>⚡</span> Dashboard
                    </h1>
                    <p className="text-xs text-muted mt-1">
                        Electrical Master — AI Costing, OCR & Quotation Tool
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link href="/costing" className="btn-primary">
                        🧮 New Costing
                    </Link>
                    <Link href="/price-lists" className="btn-secondary">
                        📋 Upload Price List
                    </Link>
                </div>
            </div>

            {/* Session Warning */}
            {costingItemCount > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>
                            You have an active costing session with <strong>{costingItemCount}</strong> item{costingItemCount !== 1 ? "s" : ""}. Download your files before starting a new costing.
                        </span>
                    </div>
                    <Link href="/costing" className="shrink-0 text-xs font-semibold underline hover:no-underline">
                        View Session →
                    </Link>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-1">
                    <div className="text-3xl font-extrabold tracking-tight gradient-text">
                        {products.length.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-muted">Products Indexed</div>
                    <div className="text-[11px] text-muted/80">
                        {loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} loaded
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-1">
                    <div className="text-3xl font-extrabold tracking-tight gradient-text">
                        {priceLists.length}
                    </div>
                    <div className="text-xs font-medium text-muted">Price Lists</div>
                    <div className="text-[11px] text-muted/80">
                        {priceLists.filter((pl) => pl.status === "ready").length} active catalogs
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-1">
                    <div className="text-3xl font-extrabold tracking-tight gradient-text">
                        {costingItemCount}
                    </div>
                    <div className="text-xs font-medium text-muted">Costing Items</div>
                    <div className="text-[11px] text-muted/80">
                        {costingSession ? "Active estimation in progress" : "No active session"}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-1">
                    <div className="text-3xl font-extrabold tracking-tight gradient-text">
                        {boqMatches.length}
                    </div>
                    <div className="text-xs font-medium text-muted">BOQ Items Processed</div>
                    <div className="text-[11px] text-muted/80">
                        {boqMatches.filter((m) => m.status === "accepted").length} accepted matches
                    </div>
                </div>
            </div>

            {/* Split Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Data */}
                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        📡 Catalogs & Brands
                    </h2>

                    <div className="space-y-2">
                        <div className="text-xs font-medium text-muted">Loaded Brands</div>
                        {loadedBrands.length === 0 ? (
                            <div className="text-xs text-muted">
                                No price lists loaded.{" "}
                                <Link href="/price-lists" className="text-accent hover:underline font-medium">
                                    Upload one now →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {loadedBrands.map((brand) => (
                                    <span key={brand} className="badge badge-blue">
                                        ⚡ {brand}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <hr className="border-border/60" />

                    <div className="space-y-2">
                        <div className="text-xs font-medium text-muted">Price List Status</div>
                        {priceLists.length === 0 ? (
                            <div className="text-xs text-muted">No price lists uploaded.</div>
                        ) : (
                            <div className="space-y-2 pt-1">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="flex items-center justify-between rounded-lg bg-muted-bg/60 border border-border/40 p-2.5 text-xs"
                                    >
                                        <div className="truncate pr-2">
                                            <span className="font-semibold text-foreground">{pl.brand}</span>
                                            <span className="text-muted ml-2">{pl.fileName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-muted">
                                                {pl.productCount.toLocaleString()} items
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

                {/* Quick Actions */}
                <div className="rounded-xl border border-border bg-card-bg p-5 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        🚀 Quick Actions
                    </h2>

                    <div className="space-y-2.5">
                        <QuickAction
                            href="/blind-quotation"
                            icon="⚡"
                            title="Blind Quotation Finder"
                            desc="Search models by electrical readings (Amps, Poles, kA) & brand"
                        />
                        <QuickAction
                            href="/price-lists"
                            icon="📋"
                            title="Upload Price List"
                            desc="Add Schneider, ABB, Siemens, or other brand price lists"
                        />
                        <QuickAction
                            href="/costing"
                            icon="🧮"
                            title="New Costing"
                            desc="Search products, set quantities, and calculate costs"
                        />
                        <QuickAction
                            href="/import-boq"
                            icon="📥"
                            title="Import BOQ"
                            desc="Upload a customer BOQ and auto-match products"
                        />
                        <QuickAction
                            href="/templates"
                            icon="📄"
                            title="Manage Templates"
                            desc="Upload your Excel costing/quotation templates"
                        />
                    </div>

                    {/* Current Costing Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <div className="pt-4 border-t border-border/60 space-y-3">
                            <div className="text-xs font-semibold uppercase text-muted">Current Costing</div>
                            <div className="flex items-center justify-between rounded-xl bg-muted-bg/60 p-3.5 border border-border/50">
                                <div>
                                    <div className="font-semibold text-sm text-foreground">
                                        {costingSession.header.customerName || "Unnamed Customer"}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {costingSession.header.project || "No project name"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-accent text-base">
                                        {new Intl.NumberFormat("en-AU", {
                                            style: "currency",
                                            currency: costingSession.header.currency || "PKR",
                                        }).format(costingSession.totals.grandTotal)}
                                    </div>
                                    <div className="text-[11px] text-muted">
                                        {costingItemCount} items incl. GST
                                    </div>
                                </div>
                            </div>
                            <Link href="/costing" className="btn-primary w-full justify-center">
                                Continue Costing →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickAction({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3.5 p-3 rounded-xl border border-border/70 bg-muted-bg/50 hover:bg-accent/5 hover:border-accent/40 transition-all text-foreground"
        >
            <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-foreground group-hover:text-accent transition-colors">
                    {title}
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">{desc}</div>
            </div>
            <span className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all text-xs">
                →
            </span>
        </Link>
    );
}

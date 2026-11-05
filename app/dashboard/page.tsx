"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";
import {
    LayoutDashboard,
    Zap,
    FileSpreadsheet,
    Calculator,
    FileUp,
    FileText,
    Package,
    Layers,
    AlertCircle,
    ChevronRight,
    ArrowRight,
    UploadCloud,
    CheckCircle2,
    Database,
    Sparkles,
} from "lucide-react";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;
    const currency = costingSession?.header.currency || "PKR";

    return (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Engine
                        </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                        Electrical Master Switchgear — AI Costing, Multimodal OCR & Estimation Suite
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link href="/costing" className="btn-primary">
                        <Calculator className="h-4 w-4" />
                        <span>New Costing</span>
                    </Link>
                    <Link href="/price-lists" className="btn-secondary">
                        <UploadCloud className="h-4 w-4 text-muted" />
                        <span>Upload Price List</span>
                    </Link>
                </div>
            </div>

            {/* Active Session Warning Banner */}
            {costingItemCount > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                <span>Active Costing Session in Progress</span>
                                <span className="badge badge-yellow text-[10px]">
                                    {costingItemCount} item{costingItemCount !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                                Current total: <strong className="text-foreground">{currency} {new Intl.NumberFormat().format(costingSession?.totals?.grandTotal || 0)}</strong>. Download your Excel or complete quotation before starting anew.
                            </div>
                        </div>
                    </div>
                    <Link href="/costing" className="btn-primary btn-sm shrink-0 self-end sm:self-center">
                        <span>Continue Costing</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                            Products Indexed
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-accent">
                            <Package className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-foreground tracking-tight">
                        {products.length.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>{loadedBrands.length} active brand{loadedBrands.length !== 1 ? "s" : ""} indexed</span>
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                            Price Lists
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                            <FileSpreadsheet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-foreground tracking-tight">
                        {priceLists.length}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        <span>{priceLists.filter((pl) => pl.status === "ready").length} ready for lookup</span>
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                            Costing Items
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                            <Calculator className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-foreground tracking-tight">
                        {costingItemCount}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{costingSession ? `${currency} ${new Intl.NumberFormat().format(costingSession.totals.grandTotal)}` : "No active session"}</span>
                    </div>
                </div>

                {/* Metric 4 */}
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                            BOQ Matches
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                            <Layers className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-foreground tracking-tight">
                        {boqMatches.length}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{boqMatches.filter((m) => m.status === "accepted").length} accepted specs</span>
                    </div>
                </div>
            </div>

            {/* Split Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Catalogs & Brands */}
                <div className="card space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Database className="h-4 w-4 text-accent" />
                            <span>Catalogs & Brand Coverage</span>
                        </h2>
                        <Link href="/price-lists" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                            <span>Manage</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* Loaded Brands Pill Group */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted">Active Brands in Engine</div>
                        {loadedBrands.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                                No price lists loaded yet.{" "}
                                <Link href="/price-lists" className="text-accent hover:underline font-semibold">
                                    Upload brand price list →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 pt-0.5">
                                {loadedBrands.map((brand) => (
                                    <span key={brand} className="badge badge-blue py-1 px-2.5 text-xs font-medium">
                                        ⚡ {brand}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Price List Status Rows */}
                    <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold text-muted">Uploaded Catalogs</div>
                        {priceLists.length === 0 ? (
                            <div className="text-xs text-muted py-2">No catalog files uploaded.</div>
                        ) : (
                            <div className="space-y-2.5">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="flex items-center justify-between rounded-xl bg-muted-bg/50 border border-border/70 p-3 hover:border-accent/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-accent">
                                                <FileSpreadsheet className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="badge badge-blue font-bold text-[10px]">
                                                        {pl.brand}
                                                    </span>
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {pl.fileName}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted mt-0.5">
                                                    Uploaded {pl.uploadDate} · {pl.productCount.toLocaleString()} products
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
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

                    {/* Quick Catalog Upload Box to balance card height */}
                    <div className="pt-2">
                        <Link
                            href="/price-lists"
                            className="group flex items-center justify-between p-3.5 rounded-xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-2.5 text-xs">
                                <UploadCloud className="h-4 w-4 text-accent" />
                                <span className="font-semibold text-foreground">Upload another Price List</span>
                                <span className="text-muted text-[11px] hidden sm:inline">(Excel, PDF, or Image)</span>
                            </div>
                            <span className="text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">
                                Upload →
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Column 2: Quick Actions & Current Costing */}
                <div className="card space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-accent" />
                            <span>Quick Actions</span>
                        </h2>
                    </div>

                    <div className="space-y-2">
                        <QuickActionCard
                            href="/blind-quotation"
                            icon={Zap}
                            iconColor="text-amber-500 bg-amber-500/10"
                            title="Blind Quotation Finder"
                            desc="Find product models by electrical specs (Amps, Poles, kA) without model numbers"
                        />
                        <QuickActionCard
                            href="/costing"
                            icon={Calculator}
                            iconColor="text-emerald-500 bg-emerald-500/10"
                            title="Costing & Estimation"
                            desc="Add catalog products, set discounts, margins, and compute selling prices"
                        />
                        <QuickActionCard
                            href="/import-boq"
                            icon={FileUp}
                            iconColor="text-blue-500 bg-blue-500/10"
                            title="Import Customer BOQ"
                            desc="Upload customer spreadsheets, PDFs, or drawings with auto spec matching"
                        />
                        <QuickActionCard
                            href="/price-lists"
                            icon={FileSpreadsheet}
                            iconColor="text-purple-500 bg-purple-500/10"
                            title="Manage Price Lists"
                            desc="Upload and index Schneider, ABB, Siemens, Chint, and other price lists"
                        />
                        <QuickActionCard
                            href="/templates"
                            icon={FileText}
                            iconColor="text-slate-500 bg-slate-500/10"
                            title="Manage Excel Templates"
                            desc="Configure custom column layouts and company export formats"
                        />
                    </div>

                    {/* Current Costing Executive Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/60">
                            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                        Current Costing Session
                                    </span>
                                    <span className="badge badge-blue text-[10px]">Active</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 pr-3">
                                        <div className="font-bold text-sm text-foreground truncate">
                                            {costingSession.header.customerName || "Unnamed Customer"}
                                        </div>
                                        <div className="text-xs text-muted truncate mt-0.5">
                                            {costingSession.header.project || "No project name"} · {costingSession.header.reference || "No ref"}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-extrabold text-accent text-lg">
                                            {currency} {new Intl.NumberFormat().format(costingSession.totals.grandTotal)}
                                        </div>
                                        <div className="text-[11px] text-muted">
                                            {costingItemCount} items incl. GST
                                        </div>
                                    </div>
                                </div>

                                <Link href="/costing" className="btn-primary w-full justify-center text-xs py-2.5">
                                    <span>Continue Costing Session</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickActionCard({
    href,
    icon: Icon,
    iconColor,
    title,
    desc,
}: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    title: string;
    desc: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3.5 p-3 rounded-xl border border-border/70 bg-card-bg hover:bg-muted-bg/60 hover:border-accent/40 transition-all text-foreground shadow-2xs"
        >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor} group-hover:scale-105 transition-transform`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-foreground group-hover:text-accent transition-colors">
                    {title}
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">{desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted/60 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
    );
}

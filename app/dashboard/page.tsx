"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";
import {
    Calculator,
    Upload,
    FileSpreadsheet,
    Zap,
    FileCode,
    Boxes,
    CheckCircle2,
    Sparkles,
    AlertTriangle,
    ArrowRight,
    Layers,
} from "lucide-react";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;
    const currency = costingSession?.header.currency || "PKR";
    const readyPriceLists = priceLists.filter((pl) => pl.status === "ready").length;
    const acceptedBoqMatches = boqMatches.filter((m) => m.status === "accepted").length;

    return (
        <div className="p-6 sm:p-8 space-y-6 w-full">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Welcome back! Here's your costing overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/costing"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98]"
                    >
                        <Calculator className="h-4 w-4" />
                        <span>New Costing</span>
                    </Link>
                    <Link
                        href="/price-lists"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-medium text-xs sm:text-sm shadow-2xs hover:border-slate-300 transition-all duration-150"
                    >
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span>Upload Price List</span>
                    </Link>
                </div>
            </div>

            {/* Active Session Warning Banner */}
            {costingItemCount > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/20 p-4 sm:p-5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-2xs">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
                                    <span>Active Costing Session in Progress</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300/70">
                                        {costingItemCount} {costingItemCount === 1 ? "item" : "items"}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-800/80 mt-0.5">
                                    You have active calculations running. View or export your quote before starting a new costing session.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/costing"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm shrink-0 group"
                        >
                            <span>View Session</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
            )}

            {/* 4-Metric SaaS Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Metric 1: Products Indexed */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Products Indexed
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
                            <Boxes className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                            {products.length.toLocaleString()}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200/60">
                                <Sparkles className="h-3 w-3" /> Live
                            </span>
                            <span>{loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} active</span>
                        </div>
                    </div>
                </div>

                {/* Metric 2: Price Lists */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Price Lists
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
                            <FileSpreadsheet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {priceLists.length}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{readyPriceLists} active catalog{readyPriceLists !== 1 ? "s" : ""}</span>
                            <span>·</span>
                            <span>{priceLists.length - readyPriceLists} pending</span>
                        </div>
                    </div>
                </div>

                {/* Metric 3: Costing Items */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Costing Items
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
                            <Calculator className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {costingItemCount}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            {costingSession && costingItemCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-[10px] border border-blue-200/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    Active estimation in progress
                                </span>
                            ) : (
                                <span>No active session</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metric 4: BOQ Processed */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            BOQ Processed
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-violet-600 transition-colors">
                            {boqMatches.length}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-emerald-600">{acceptedBoqMatches} accepted</span>
                            <span>·</span>
                            <span>{boqMatches.length - acceptedBoqMatches} pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Catalogs & Brands */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Catalogs & Brands</h2>
                                <p className="text-xs text-slate-500">Indexed manufacturer product catalogs</p>
                            </div>
                        </div>
                        <Link
                            href="/price-lists"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                        >
                            <span>Manage</span>
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* Loaded Brands */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                            Loaded Brands
                        </div>
                        {loadedBrands.length === 0 ? (
                            <div className="text-xs text-slate-500 py-2">
                                No price lists loaded.{" "}
                                <Link href="/price-lists" className="text-blue-600 hover:underline font-semibold">
                                    Upload one now →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {loadedBrands.map((brand) => (
                                    <span
                                        key={brand}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-xs font-semibold text-slate-800 hover:text-blue-700 transition-all duration-150 cursor-pointer shadow-2xs"
                                    >
                                        <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                        <span>{brand}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Price List Status */}
                    <div className="pt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                            Price List Status
                        </div>
                        {priceLists.length === 0 ? (
                            <div className="text-xs text-slate-400 py-3 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                No catalog files uploaded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 shadow-2xs">
                                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                                    <span>{pl.brand}</span>
                                                    <span className="text-slate-300 font-normal">·</span>
                                                    <span className="text-slate-500 font-normal text-[11px] truncate">{pl.fileName}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {pl.productCount ?? 0} indexed items
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 ml-2">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                                    pl.status === "ready"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                                        : pl.status === "error"
                                                        ? "bg-rose-50 text-rose-700 border-rose-200/80"
                                                        : "bg-amber-50 text-amber-700 border-amber-200/80"
                                                }`}
                                            >
                                                {pl.status === "ready" && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                )}
                                                <span className="capitalize">{pl.status}</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Quick Actions & Current Costing */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Quick Actions</h2>
                                <p className="text-xs text-slate-500">Shortcuts to key estimation workflows</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <QuickActionRow
                            href="/blind-quotation"
                            icon={Zap}
                            iconBg="bg-amber-50 text-amber-600 border-amber-100"
                            title="Blind Quotation Finder"
                            desc="Search models by electrical readings (Amps, Poles, kA) & brand"
                        />
                        <QuickActionRow
                            href="/price-lists"
                            icon={FileSpreadsheet}
                            iconBg="bg-blue-50 text-blue-600 border-blue-100"
                            title="Upload Price List"
                            desc="Add Schneider, ABB, Siemens, or other brand price lists"
                        />
                        <QuickActionRow
                            href="/costing"
                            icon={Calculator}
                            iconBg="bg-emerald-50 text-emerald-600 border-emerald-100"
                            title="New Costing"
                            desc="Search products, set quantities, margins and calculate costs"
                        />
                        <QuickActionRow
                            href="/import-boq"
                            icon={Upload}
                            iconBg="bg-violet-50 text-violet-600 border-violet-100"
                            title="Import BOQ"
                            desc="Upload a customer BOQ and auto-match products"
                        />
                        <QuickActionRow
                            href="/templates"
                            icon={FileCode}
                            iconBg="bg-rose-50 text-rose-600 border-rose-100"
                            title="Manage Templates"
                            desc="Upload and configure your Excel costing/quotation templates"
                        />
                    </div>

                    {/* Current Costing Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-5 text-white shadow-sm space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                                            Active Estimation
                                        </div>
                                        <div className="text-base font-bold text-white mt-0.5 truncate">
                                            {costingSession.header.customerName || "Unnamed Customer"}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate mt-0.5">
                                            {costingSession.header.project || "No project name"}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xl sm:text-2xl font-extrabold text-blue-400 tracking-tight">
                                            {currency} {new Intl.NumberFormat().format(costingSession.totals.grandTotal)}
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            {costingItemCount} item{costingItemCount !== 1 ? "s" : ""} · Incl. GST
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href="/costing"
                                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm group"
                                >
                                    <span>Continue Costing Session</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickActionRow({
    href,
    icon: Icon,
    iconBg,
    title,
    desc,
}: {
    href: string;
    icon: typeof Zap;
    iconBg: string;
    title: string;
    desc: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200/90 hover:bg-slate-50/90 transition-all duration-150 text-slate-900"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBg} group-hover:scale-105 transition-transform shadow-2xs`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                        {title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{desc}</div>
                </div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:bg-blue-50/60 transition-all shrink-0 ml-2">
                <ArrowRight className="h-4 w-4" />
            </div>
        </Link>
    );
}

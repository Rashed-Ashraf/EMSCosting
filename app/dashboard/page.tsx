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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Welcome back! Here's your costing overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/costing"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                    >
                        <Calculator className="h-4 w-4" />
                        <span>New Costing</span>
                    </Link>
                    <Link
                        href="/price-lists"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 font-medium text-sm shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                    >
                        <Upload className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span>Upload Price List</span>
                    </Link>
                </div>
            </div>

            {/* Active Session Warning Banner */}
            {costingItemCount > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/20 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-amber-950 dark:text-amber-300 flex items-center gap-2.5 flex-wrap">
                                    <span>Active Costing Session in Progress</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60">
                                        {costingItemCount} {costingItemCount === 1 ? "item" : "items"}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    You have active calculations running. View or export your quote before starting a new costing session.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/costing"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all duration-200 shadow-sm shrink-0 group"
                        >
                            <span>View Session</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            )}

            {/* 4-Metric SaaS Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric 1: Products Indexed */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:shadow-none hover:border-slate-300/80 dark:hover:border-slate-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Products Indexed
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                            <Boxes className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {products.length.toLocaleString()}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                                <Sparkles className="h-3 w-3" /> Live
                            </span>
                            <span>{loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} active</span>
                        </div>
                    </div>
                </div>

                {/* Metric 2: Price Lists */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:shadow-none hover:border-slate-300/80 dark:hover:border-slate-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Price Lists
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {priceLists.length}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{readyPriceLists} active catalog{readyPriceLists !== 1 ? "s" : ""}</span>
                            <span>·</span>
                            <span>{priceLists.length - readyPriceLists} pending</span>
                        </div>
                    </div>
                </div>

                {/* Metric 3: Costing Items */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:shadow-none hover:border-slate-300/80 dark:hover:border-slate-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Costing Items
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                            <Calculator className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {costingItemCount}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            {costingSession && costingItemCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full text-xs border border-blue-200/60 dark:border-blue-800/60">
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
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:shadow-none hover:border-slate-300/80 dark:hover:border-slate-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            BOQ Processed
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                            {boqMatches.length}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{acceptedBoqMatches} accepted</span>
                            <span>·</span>
                            <span>{boqMatches.length - acceptedBoqMatches} pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Catalogs & Brands */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Catalogs & Brands</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Indexed manufacturer product catalogs</p>
                            </div>
                        </div>
                        <Link
                            href="/price-lists"
                            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors duration-200"
                        >
                            <span>Manage</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Loaded Brands */}
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                            Loaded Brands
                        </div>
                        {loadedBrands.length === 0 ? (
                            <div className="text-sm text-slate-600 dark:text-slate-400 py-3">
                                No price lists loaded.{" "}
                                <Link href="/price-lists" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                                    Upload one now →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2.5">
                                {loadedBrands.map((brand) => (
                                    <span
                                        key={brand}
                                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 cursor-pointer shadow-2xs"
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
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                            Price List Status
                        </div>
                        {priceLists.length === 0 ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                No catalog files uploaded yet.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 shadow-2xs">
                                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate flex items-center gap-2">
                                                    <span>{pl.brand}</span>
                                                    <span className="text-slate-300 dark:text-slate-600 font-normal">·</span>
                                                    <span className="text-slate-500 dark:text-slate-400 font-normal text-xs truncate">{pl.fileName}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {pl.productCount ?? 0} indexed items
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 ml-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                                    pl.status === "ready"
                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                                                        : pl.status === "error"
                                                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80"
                                                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80"
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
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Shortcuts to key estimation workflows</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <QuickActionRow
                            href="/blind-quotation"
                            icon={Zap}
                            iconBg="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40"
                            title="Blind Quotation Finder"
                            desc="Search models by electrical readings (Amps, Poles, kA) & brand"
                        />
                        <QuickActionRow
                            href="/price-lists"
                            icon={FileSpreadsheet}
                            iconBg="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40"
                            title="Upload Price List"
                            desc="Add Schneider, ABB, Siemens, or other brand price lists"
                        />
                        <QuickActionRow
                            href="/costing"
                            icon={Calculator}
                            iconBg="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                            title="New Costing"
                            desc="Search products, set quantities, margins and calculate costs"
                        />
                        <QuickActionRow
                            href="/import-boq"
                            icon={Upload}
                            iconBg="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40"
                            title="Import BOQ"
                            desc="Upload a customer BOQ and auto-match products"
                        />
                        <QuickActionRow
                            href="/templates"
                            icon={FileCode}
                            iconBg="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"
                            title="Manage Templates"
                            desc="Upload and configure your Excel costing/quotation templates"
                        />
                    </div>

                    {/* Current Costing Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 text-white shadow-md space-y-5 transition-all duration-200">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                            Active Estimation
                                        </div>
                                        <div className="text-lg font-bold text-white mt-1 truncate">
                                            {costingSession.header.customerName || "Unnamed Customer"}
                                        </div>
                                        <div className="text-sm text-slate-400 truncate mt-0.5">
                                            {costingSession.header.project || "No project name"}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-extrabold text-blue-400 tracking-tight">
                                            {currency} {new Intl.NumberFormat().format(costingSession.totals.grandTotal)}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {costingItemCount} item{costingItemCount !== 1 ? "s" : ""} · Incl. GST
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href="/costing"
                                    className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm group active:scale-[0.99]"
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
            className="group flex items-center justify-between p-3.5 rounded-xl border border-transparent hover:border-slate-200/90 dark:hover:border-slate-700/80 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-all duration-200 text-slate-900 dark:text-white"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconBg} group-hover:scale-105 transition-transform shadow-2xs`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {title}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">{desc}</div>
                </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 group-hover:bg-blue-50/60 dark:group-hover:bg-blue-950/40 transition-all duration-200 shrink-0 ml-3">
                <ArrowRight className="h-4 w-4" />
            </div>
        </Link>
    );
}

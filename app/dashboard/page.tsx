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
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Welcome back! Here's your costing overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/costing"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
                    >
                        <Calculator className="h-4 w-4" />
                        <span>New Costing</span>
                    </Link>
                    <Link
                        href="/price-lists"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-[#e5e5e5] dark:border-neutral-800 font-medium text-sm shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200"
                    >
                        <Upload className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                        <span>Upload Price List</span>
                    </Link>
                </div>
            </div>

            {/* Active Session Warning Banner */}
            {costingItemCount > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-amber-950 dark:text-amber-300 flex items-center gap-2.5 flex-wrap">
                                    <span>Active Costing Session in Progress</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                                        {costingItemCount} {costingItemCount === 1 ? "item" : "items"}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    You have active calculations running. View or export your quote before starting a new costing session.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/costing"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all duration-200 shadow-xs shrink-0 group"
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
                <div className="relative overflow-hidden rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs hover:shadow-md dark:shadow-none hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            Products Indexed
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                            <Boxes className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {products.length.toLocaleString()}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                                <Sparkles className="h-3 w-3" /> Live
                            </span>
                            <span>{loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} active</span>
                        </div>
                    </div>
                </div>

                {/* Metric 2: Price Lists */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs hover:shadow-md dark:shadow-none hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            Price Lists
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                            <FileSpreadsheet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {priceLists.length}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{readyPriceLists} active</span>
                            <span>·</span>
                            <span>{priceLists.length - readyPriceLists} pending</span>
                        </div>
                    </div>
                </div>

                {/* Metric 3: Costing Items */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs hover:shadow-md dark:shadow-none hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            Costing Items
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                            <Calculator className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {costingItemCount}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            {costingSession && costingItemCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full text-xs border border-blue-200/60 dark:border-blue-800/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    Active estimation
                                </span>
                            ) : (
                                <span>No active session</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metric 4: BOQ Processed */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs hover:shadow-md dark:shadow-none hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            BOQ Processed
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white group-hover:text-violet-600 transition-colors">
                            {boqMatches.length}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{acceptedBoqMatches} accepted</span>
                            <span>·</span>
                            <span>{boqMatches.length - acceptedBoqMatches} pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Catalogs & Brands */}
                <div className="rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-6 transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0] dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Catalogs & Brands</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Indexed manufacturer product catalogs</p>
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
                        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                            Loaded Brands
                        </div>
                        {loadedBrands.length === 0 ? (
                            <div className="text-sm text-neutral-500 dark:text-neutral-400 py-3">
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
                                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-[#e5e5e5] dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-300 transition-all duration-200 cursor-pointer shadow-xs"
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
                        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                            Price List Status
                        </div>
                        {priceLists.length === 0 ? (
                            <div className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center bg-neutral-50/60 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-[#e5e5e5] dark:border-neutral-800">
                                No catalog files uploaded yet.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {priceLists.map((pl) => (
                                    <div
                                        key={pl.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50/60 dark:bg-neutral-800/40 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/70 border border-[#e5e5e5]/80 dark:border-neutral-700/60 transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-neutral-800 border border-[#e5e5e5] dark:border-neutral-700 text-neutral-500 shadow-xs">
                                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate flex items-center gap-2">
                                                    <span>{pl.brand}</span>
                                                    <span className="text-neutral-300 dark:text-neutral-600 font-normal">·</span>
                                                    <span className="text-neutral-500 dark:text-neutral-400 font-normal text-xs truncate">{pl.fileName}</span>
                                                </div>
                                                <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
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
                <div className="rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] p-6 shadow-xs space-y-6 transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0] dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Quick Actions</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Shortcuts to key estimation workflows</p>
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
                        <div className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-neutral-800">
                            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 p-6 shadow-xs space-y-5 transition-all duration-200">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            Active Estimation
                                        </div>
                                        <div className="text-lg font-bold text-neutral-900 dark:text-white mt-1 truncate">
                                            {costingSession.header.customerName || "Unnamed Customer"}
                                        </div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                            {costingSession.header.project || "No project specified"}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                                            {currency} {new Intl.NumberFormat().format(costingSession.totals.grandTotal)}
                                        </div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                            {costingItemCount} item{costingItemCount !== 1 ? "s" : ""} · Incl. GST
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href="/costing"
                                    className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-xs hover:shadow active:scale-[0.99] group"
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
            className="group flex items-center justify-between p-3.5 rounded-xl border border-transparent hover:border-[#e5e5e5] dark:hover:border-neutral-700/80 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 transition-all duration-200 text-neutral-900 dark:text-white"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBg} group-hover:scale-105 transition-transform shadow-xs`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-sm text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {title}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{desc}</div>
                </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 group-hover:bg-blue-50/60 dark:group-hover:bg-blue-950/40 transition-all duration-200 shrink-0 ml-3">
                <ArrowRight className="h-4 w-4" />
            </div>
        </Link>
    );
}

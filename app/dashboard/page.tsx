"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { QuickAction } from "@/components/ui/QuickAction";
import {
    Calculator,
    Upload,
    AlertCircle,
    Package,
    FileText,
    CheckCircle,
    Layers,
    Zap,
    Sparkles,
    FileUp,
    ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;
    const totals = costingSession?.totals;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            Welcome back! Here's your costing overview.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/costing"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Calculator className="w-4 h-4" />
                            New Costing
                        </Link>
                        <Link
                            href="/price-lists"
                            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Price List
                        </Link>
                    </div>
                </div>

                {/* Warning Banner */}
                {costingItemCount > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                    Active Costing Session in Progress
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                    You have {costingItemCount} items. Download your files before starting a new costing.
                                </p>
                            </div>
                        </div>
                        <Link href="/costing" className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline shrink-0">
                            View Session →
                        </Link>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Products Indexed"
                        value={products.length.toLocaleString()}
                        subtitle={`${loadedBrands.length} brand${loadedBrands.length !== 1 ? "s" : ""} active`}
                        icon={<Package className="w-5 h-5" />}
                    />
                    <StatCard
                        label="Price Lists"
                        value={priceLists.length.toString()}
                        subtitle={`${priceLists.filter((pl) => pl.status === "ready").length} active catalog`}
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatCard
                        label="Costing Items"
                        value={costingItemCount.toString()}
                        subtitle="Active estimation in progress"
                        icon={<Calculator className="w-5 h-5" />}
                    />
                    <StatCard
                        label="BOQ Processed"
                        value={boqMatches.length.toString()}
                        subtitle={`${boqMatches.filter((m) => m.status === "accepted").length} accepted`}
                        icon={<CheckCircle className="w-5 h-5" />}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Catalogs */}
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Catalogs & Brands</h2>
                                <p className="text-xs text-neutral-500">Indexed manufacturer product catalogs</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Loaded Brands</div>
                                {loadedBrands.length === 0 ? (
                                    <div className="text-sm text-neutral-500 py-1">
                                        No brands loaded yet.{" "}
                                        <Link href="/price-lists" className="text-blue-600 hover:underline">
                                            Upload one now →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {loadedBrands.map((brand) => (
                                            <span
                                                key={brand}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800"
                                            >
                                                <Zap className="w-3 h-3" />
                                                {brand}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Price List Status</div>
                                {priceLists.length === 0 ? (
                                    <div className="text-sm text-neutral-400 py-3 text-center">
                                        No price lists uploaded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {priceLists.map((pl) => (
                                            <div key={pl.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{pl.brand}</div>
                                                        <div className="text-xs text-neutral-500 truncate">{pl.fileName} · {pl.productCount ?? 0} items</div>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${
                                                    pl.status === "ready"
                                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                                        : pl.status === "error"
                                                        ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                                                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                                } text-xs font-medium rounded-full shrink-0 ml-2`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        pl.status === "ready" ? "bg-emerald-500" : pl.status === "error" ? "bg-rose-500" : "bg-amber-500"
                                                    }`} />
                                                    <span className="capitalize">{pl.status}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Actions */}
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Quick Actions</h2>
                                <p className="text-xs text-neutral-500">Shortcuts to key estimation workflows</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <QuickAction
                                icon={<Zap className="w-4 h-4" />}
                                iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                title="Blind Quotation Finder"
                                description="Search models by electrical readings (Amps, Poles, kA) & brand"
                                href="/blind-quotation"
                            />
                            <QuickAction
                                icon={<Upload className="w-4 h-4" />}
                                iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                title="Upload Price List"
                                description="Add Schneider, ABB, Siemens, or other brand price lists"
                                href="/price-lists"
                            />
                            <QuickAction
                                icon={<Calculator className="w-4 h-4" />}
                                iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                title="New Costing"
                                description="Search products, set quantities, margins and calculate costs"
                                href="/costing"
                            />
                            <QuickAction
                                icon={<FileUp className="w-4 h-4" />}
                                iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                title="Import BOQ"
                                description="Upload a customer BOQ and auto-match products"
                                href="/import-boq"
                            />
                            <QuickAction
                                icon={<FileText className="w-4 h-4" />}
                                iconBg="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
                                title="Manage Templates"
                                description="Upload and configure your Excel costing/quotation templates"
                                href="/templates"
                            />
                        </div>
                    </div>
                </div>

                {/* Active Estimation Card */}
                {costingSession && costingItemCount > 0 && (
                    <div className="mt-6 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Active Estimation</div>
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                                    {costingSession.header.customerName || "Unnamed Customer"}
                                </h3>
                                <p className="text-sm text-neutral-500">
                                    {costingSession.header.project || "No project name"}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                    PKR {totals?.grandTotal?.toLocaleString("en-PK") ?? 0}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {costingItemCount} items · Incl. GST
                                </div>
                            </div>
                        </div>
                        <Link href="/costing" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                            Continue Costing Session
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

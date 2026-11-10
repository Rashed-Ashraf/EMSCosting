"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useEmsStore } from "@/stores/appStore";
import {
    parseElectricalQuery,
    matchBlindQuotation,
    getComponentCategories,
    STANDARD_CURRENT_RATINGS,
    STANDARD_KA_RATINGS,
    type BlindSearchFilters,
    type BlindQuotationResult,
    type ParsedElectricalSpec,
} from "@/lib/search/blindQuotation";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import Link from "next/link";

export default function BlindQuotationPage() {
    const { products, addItemToCosting, costingSession } = useEmsStore();

    // Input mode: "smart" (NLP text parse) or "guided" (spec selectors)
    const [mode, setMode] = useState<"smart" | "guided">("smart");

    // Search query for Smart Mode
    const [smartQuery, setSmartQuery] = useState("");
    const [parsedSpec, setParsedSpec] = useState<ParsedElectricalSpec>({ keywords: [] });

    // Guided filters
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedCurrent, setSelectedCurrent] = useState("");
    const [selectedPoles, setSelectedPoles] = useState("");
    const [selectedKa, setSelectedKa] = useState("");
    const [selectedVoltage, setSelectedVoltage] = useState("");

    // Results & UI state
    const [results, setResults] = useState<BlindQuotationResult[]>([]);
    const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
    const [toast, setToast] = useState<string | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    // Available loaded brands + default brands
    const availableBrands = useMemo(() => {
        const loaded = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
        if (loaded.length > 0) return loaded;
        return ["Schneider Electric", "ABB", "Siemens", "Hager", "Legrand", "Clipsal", "Eaton", "Chint", "LS Electric"];
    }, [products]);

    const categories = useMemo(() => getComponentCategories(), []);

    // Perform Blind Search when inputs change
    useEffect(() => {
        clearTimeout(searchTimer.current!);
        searchTimer.current = setTimeout(() => {
            if (products.length === 0) {
                setResults([]);
                return;
            }

            if (mode === "smart") {
                if (!smartQuery.trim()) {
                    setParsedSpec({ keywords: [] });
                    setResults([]);
                    return;
                }
                const parsed = parseElectricalQuery(smartQuery);
                setParsedSpec(parsed);

                const res = matchBlindQuotation(
                    {
                        query: smartQuery,
                        brand: selectedBrand || undefined,
                    },
                    products,
                    50
                );
                setResults(res);
            } else {
                // Guided mode
                const hasAnyFilter = selectedBrand || selectedType || selectedCurrent || selectedPoles || selectedKa || selectedVoltage;
                if (!hasAnyFilter) {
                    setResults([]);
                    return;
                }

                const filters: BlindSearchFilters = {
                    brand: selectedBrand || undefined,
                    componentType: selectedType || undefined,
                    currentRating: selectedCurrent || undefined,
                    poles: selectedPoles || undefined,
                    breakingCapacity: selectedKa || undefined,
                    voltage: selectedVoltage || undefined,
                };
                const res = matchBlindQuotation(filters, products, 50);
                setResults(res);
            }
        }, 200);

        return () => clearTimeout(searchTimer.current!);
    }, [smartQuery, selectedBrand, selectedType, selectedCurrent, selectedPoles, selectedKa, selectedVoltage, mode, products]);

    const handleAddProduct = (result: BlindQuotationResult) => {
        const qty = qtyMap[result.product.id] || 1;
        for (let i = 0; i < qty; i++) {
            addItemToCosting(result.product);
        }
        showToast(`✅ Added ${qty}x ${result.product.productCode} (${result.product.brand}) to Costing`);
    };

    const handleClearAll = () => {
        setSmartQuery("");
        setSelectedBrand("");
        setSelectedType("");
        setSelectedCurrent("");
        setSelectedPoles("");
        setSelectedKa("");
        setSelectedVoltage("");
        setResults([]);
    };

    return (
        <div className="p-6 sm:p-8 w-full space-y-6">
            {toast && (
                <div className="toast border-l-4 border-emerald-500 shadow-md">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="text-amber-500">⚡</span> Blind Quotation & Spec Finder
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Find catalog model codes, specs, and live pricing when the client gives only the <strong className="text-slate-900 dark:text-white font-semibold">Brand</strong> and <strong className="text-slate-900 dark:text-white font-semibold">Electrical Readings (Amps, Poles, kA, kW)</strong> without a model number.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {costingSession && costingSession.items.length > 0 && (
                        <Link
                            href="/costing"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-2xs"
                        >
                            <span>🧮</span>
                            <span>View Costing ({costingSession.items.length} items)</span>
                        </Link>
                    )}
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                        onClick={handleClearAll}
                    >
                        <span>🔄</span>
                        <span>Reset Filters</span>
                    </button>
                </div>
            </div>

            {/* Warning if no products loaded */}
            {products.length === 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ No price lists or products indexed yet.{" "}
                    <Link href="/price-lists" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Upload a price list (Schneider, ABB, Siemens, etc.) first →
                    </Link>
                </div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => setMode("smart")}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        mode === "smart"
                            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs"
                    }`}
                >
                    <span>🧠</span>
                    <span>Smart Natural Spec Search (Paste RFQ)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMode("guided")}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        mode === "guided"
                            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs"
                    }`}
                >
                    <span>🎛️</span>
                    <span>Guided Spec Builder (Brand + Readings)</span>
                </button>
            </div>

            {/* Smart NLP Search Mode */}
            {mode === "smart" && (
                <div className="card space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label htmlFor="smart-spec-input" className="text-xs font-semibold text-muted uppercase tracking-wider">
                            Enter Blind Client Specification
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted">Quick examples:</span>
                            {["Schneider 250A 3P 36kA MCCB", "ABB 100A 4P 25kA breaker", "Siemens contactor 15kW 230V", "Hager 32A 3P MCB Type C"].map((ex) => (
                                <button
                                    key={ex}
                                    type="button"
                                    className="px-2 py-0.5 rounded text-[11px] bg-muted-bg hover:bg-blue-600/10 text-muted hover:text-blue-600 transition-colors"
                                    onClick={() => setSmartQuery(ex)}
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            id="smart-spec-input"
                            type="text"
                            className="w-full bg-input-bg border border-input-border rounded-xl pl-11 pr-10 py-3 text-sm sm:text-base text-foreground placeholder:text-muted focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                            value={smartQuery}
                            onChange={(e) => setSmartQuery(e.target.value)}
                            placeholder="Type or paste inquiry: e.g. 'Schneider 250A 36kA 3P MCCB', 'ABB 4P 63A MCB', '15kW 415V contactor Siemens'..."
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-amber-500">⚡</span>
                        {smartQuery && (
                            <button
                                type="button"
                                onClick={() => setSmartQuery("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm p-1 rounded-full hover:bg-muted-bg"
                                aria-label="Clear search query"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Live Extracted Parameters Breakdown */}
                    {smartQuery && (
                        <div className="bg-muted-bg/60 rounded-xl p-4 border border-border space-y-3">
                            <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                                🔍 AI Electrical Parameter Extraction:
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                {parsedSpec.brand && (
                                    <span className="badge badge-blue text-xs py-1 px-2.5">
                                        🏢 Brand: <strong className="ml-1">{parsedSpec.brand}</strong>
                                    </span>
                                )}
                                {parsedSpec.componentType && (
                                    <span className="badge badge-green text-xs py-1 px-2.5">
                                        📦 Type: <strong className="ml-1">{parsedSpec.componentType}</strong>
                                    </span>
                                )}
                                {parsedSpec.currentRating && (
                                    <span className="badge badge-yellow text-xs py-1 px-2.5">
                                        ⚡ Current: <strong className="ml-1">{parsedSpec.currentRating}</strong>
                                    </span>
                                )}
                                {parsedSpec.poles && (
                                    <span className="badge badge-blue text-xs py-1 px-2.5">
                                        🔢 Poles: <strong className="ml-1">{parsedSpec.poles}</strong>
                                    </span>
                                )}
                                {parsedSpec.breakingCapacity && (
                                    <span className="badge badge-red text-xs py-1 px-2.5">
                                        💥 Breaking: <strong className="ml-1">{parsedSpec.breakingCapacity}</strong>
                                    </span>
                                )}
                                {parsedSpec.powerRating && (
                                    <span className="badge badge-green text-xs py-1 px-2.5">
                                        ⚙️ Power: <strong className="ml-1">{parsedSpec.powerRating}</strong>
                                    </span>
                                )}
                                {parsedSpec.voltage && (
                                    <span className="badge badge-gray text-xs py-1 px-2.5">
                                        🔌 Voltage: <strong className="ml-1">{parsedSpec.voltage}</strong>
                                    </span>
                                )}
                                {parsedSpec.curve && (
                                    <span className="badge badge-gray text-xs py-1 px-2.5">
                                        📈 Trip/Curve: <strong className="ml-1">{parsedSpec.curve}</strong>
                                    </span>
                                )}

                                {/* Optional Brand Filter override */}
                                <div className="ml-auto flex items-center gap-2">
                                    <label htmlFor="smart-brand-override" className="text-xs text-muted font-medium">
                                        Filter Brand:
                                    </label>
                                    <select
                                        id="smart-brand-override"
                                        className="select text-xs py-1 px-2.5 w-auto"
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                        <option value="">All Brands</option>
                                        {availableBrands.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Guided Spec Builder Mode */}
            {mode === "guided" && (
                <div className="card space-y-5">
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                        Configure Electrical Specifications
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Brand */}
                        <div className="space-y-1.5">
                            <label htmlFor="guided-brand-select" className="label mb-0">1. Brand Name</label>
                            <select
                                id="guided-brand-select"
                                className="select text-sm"
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                            >
                                <option value="">Select or Any Brand</option>
                                {availableBrands.map((b) => (
                                    <option key={b} value={b}>⚡ {b}</option>
                                ))}
                            </select>
                        </div>

                        {/* Component Type */}
                        <div className="space-y-1.5">
                            <label htmlFor="guided-category-select" className="label mb-0">2. Component Category</label>
                            <select
                                id="guided-category-select"
                                className="select text-sm"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c.type} value={c.type}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Poles */}
                        <div className="space-y-1.5">
                            <span className="label mb-0">3. Number of Poles</span>
                            <div className="flex gap-2">
                                {["1P", "2P", "3P", "4P"].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                                            selectedPoles === p
                                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                : "bg-card-bg text-foreground border-border hover:bg-muted-bg"
                                        }`}
                                        onClick={() => setSelectedPoles(selectedPoles === p ? "" : p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Current Rating Chips & Input */}
                    <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className="label mb-0">4. Current / Amperage Rating (Amps)</span>
                            <span className="text-xs text-muted">
                                Selected: <strong className="text-foreground">{selectedCurrent || "None"}</strong>
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {STANDARD_CURRENT_RATINGS.map((amp) => (
                                <button
                                    key={amp}
                                    type="button"
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                                        selectedCurrent === amp
                                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                            : "bg-card-bg text-muted hover:text-foreground border-border hover:bg-muted-bg"
                                    }`}
                                    onClick={() => setSelectedCurrent(selectedCurrent === amp ? "" : amp)}
                                >
                                    {amp}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                id="guided-custom-current"
                                type="text"
                                className="input max-w-xs text-xs"
                                placeholder="Or type custom Amps e.g. 175"
                                value={selectedCurrent.replace(/[^0-9.]/g, "")}
                                onChange={(e) => setSelectedCurrent(e.target.value ? `${e.target.value}A` : "")}
                            />
                            <label htmlFor="guided-custom-current" className="text-xs text-muted">
                                Ampere (A)
                            </label>
                        </div>
                    </div>

                    {/* Breaking Capacity (kA) & Voltage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div className="space-y-2">
                            <span className="label mb-0">5. Breaking Capacity (Short Circuit kA)</span>
                            <div className="flex flex-wrap gap-1.5">
                                {STANDARD_KA_RATINGS.map((ka) => (
                                    <button
                                        key={ka}
                                        type="button"
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                                            selectedKa === ka
                                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                : "bg-card-bg text-muted hover:text-foreground border-border hover:bg-muted-bg"
                                        }`}
                                        onClick={() => setSelectedKa(selectedKa === ka ? "" : ka)}
                                    >
                                        {ka}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="label mb-0">6. Voltage / Coil</span>
                            <div className="flex flex-wrap gap-1.5">
                                {["240V", "415V", "230VAC", "24VDC", "110VAC", "400V"].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                                            selectedVoltage === v
                                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                : "bg-card-bg text-muted hover:text-foreground border-border hover:bg-muted-bg"
                                        }`}
                                        onClick={() => setSelectedVoltage(selectedVoltage === v ? "" : v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Section */}
            <div className="card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                    <div>
                        <h2 className="text-base font-bold text-foreground">
                            Matching Catalog Options ({results.length})
                        </h2>
                        <p className="text-xs text-muted mt-0.5">
                            Ranked by electrical spec compatibility & net cost
                        </p>
                    </div>
                    {results.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="badge badge-green">
                                {results.filter((r) => r.score >= 0.8).length} Exact / High Spec Matches
                            </span>
                        </div>
                    )}
                </div>

                {results.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-3">
                        <div className="text-4xl">⚡</div>
                        <div className="font-semibold text-sm text-foreground">
                            {products.length === 0
                                ? "No product price lists loaded"
                                : (mode === "smart" && !smartQuery) || (mode === "guided" && !selectedBrand && !selectedType && !selectedCurrent)
                                ? "Enter brand & electrical readings above to find matching models"
                                : "No catalog models match all the specified electrical readings"}
                        </div>
                        <div className="text-xs text-muted">
                            {products.length === 0 ? (
                                <Link href="/price-lists" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                    Upload your price lists in Price Lists page →
                                </Link>
                            ) : (
                                "Try broadening your criteria (e.g. search with Amps + Brand only, or check alternatives)."
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {results.map((result) => {
                            const { product, score, matchDetails } = result;
                            const qty = qtyMap[product.id] || 1;
                            const isHighMatch = score >= 0.8;

                            return (
                                <div
                                    key={product.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                                        isHighMatch
                                            ? "bg-card-bg border-blue-500/40 shadow-xs ring-1 ring-blue-500/10"
                                            : "bg-muted-bg/50 border-border"
                                    }`}
                                >
                                    {/* Left: Product info & match badges */}
                                    <div className="flex-1 min-w-0 pr-0 sm:pr-4 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="badge badge-blue font-bold">
                                                {product.brand}
                                            </span>
                                            <span className="font-bold text-sm text-foreground font-mono">
                                                {product.productCode}
                                            </span>
                                            <span className={`badge ${score >= 0.8 ? "badge-green" : score >= 0.6 ? "badge-yellow" : "badge-gray"}`}>
                                                {Math.round(score * 100)}% Spec Match
                                            </span>
                                            {product.category && (
                                                <span className="badge badge-gray text-[11px]">
                                                    {product.category}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs sm:text-sm text-foreground font-medium">
                                            {product.description || product.productName}
                                        </div>

                                        {/* Matched Feature Tags */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[11px] text-muted">Matched:</span>
                                            {matchDetails.matchedFeatures.map((f, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm font-medium"
                                                >
                                                    ✓ {f}
                                                </span>
                                            ))}
                                            {matchDetails.missingFeatures.map((m, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[11px] bg-red-500/10 text-muted px-1.5 py-0.5 rounded-sm"
                                                >
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Pricing & Add Action */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                        <div className="text-right">
                                            <div className="text-xs text-muted line-through">
                                                {formatCurrency(product.listPrice, product.currency || "PKR")}
                                            </div>
                                            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(product.netCost, product.currency || "PKR")}
                                            </div>
                                            <div className="text-[11px] text-muted">
                                                Disc: {formatPercent(product.discount)}
                                            </div>
                                        </div>

                                        {/* Qty selector */}
                                        <div className="flex items-center gap-1.5">
                                            <label htmlFor={`qty-${product.id}`} className="text-[11px] text-muted">Qty:</label>
                                            <input
                                                id={`qty-${product.id}`}
                                                type="number"
                                                min="1"
                                                value={qty}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    setQtyMap({ ...qtyMap, [product.id]: val });
                                                }}
                                                className="w-14 bg-input-bg border border-input-border rounded-md text-foreground px-2 py-1 text-xs text-center focus:border-blue-600 outline-none"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-primary btn-sm"
                                            onClick={() => handleAddProduct(result)}
                                        >
                                            + Add to Costing
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

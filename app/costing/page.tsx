"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEmsStore, useHasHydrated } from "@/stores/appStore";
import { searchProducts } from "@/lib/search/productSearch";
import { matchBlindQuotation, parseElectricalQuery } from "@/lib/search/blindQuotation";
import { matchPriceListItems, type MatchResult } from "@/lib/matching-engine";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { nanoid, formatDate, formatDateDisplay, isValidBrandName } from "@/lib/utils";
import type { Product, SearchResult, CostingItem, BOQItem } from "@/lib/types";
import RequirementUploader from "@/components/costing/RequirementUploader";
import RequirementWizard from "@/components/costing/RequirementWizard";
import RequirementPreviewSection from "@/components/costing/RequirementPreviewSection";
import Link from "next/link";

const CURRENCIES = ["PKR", "USD", "EUR", "AED", "SAR", "GBP", "AUD"];

export default function CostingPage() {
    const {
        brands, products, costingSession, initSession, updateHeader,
        addItemToCosting, removeItemFromCosting, updateCostingItem, clearSession,
    } = useEmsStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [brandFilter, setBrandFilter] = useState<string>("all");
    const [searchResults, setSearchResults] = useState<MatchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showNewWarning, setShowNewWarning] = useState(false);
    const [showQuotation, setShowQuotation] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardInitialIndex, setWizardInitialIndex] = useState(0);
    const [requirementItems, setRequirementItems] = useState<BOQItem[]>([]);
    const [requirementFileName, setRequirementFileName] = useState("");
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

    const availableBrands = Array.from(
        new Set([
            ...(brands && brands.length > 0 ? brands : []),
            ...products.map((p) => p.brand).filter(Boolean),
        ])
    );

    const header = costingSession?.header;
    const items = costingSession?.items ?? [];
    const totals = costingSession?.totals;
    const curr = header?.currency ?? "PKR";

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    const hasHydrated = useHasHydrated();

    // Auto-init session if none exists AFTER store has hydrated from IndexedDB
    useEffect(() => {
        if (hasHydrated && !costingSession) {
            initSession();
        }
    }, [hasHydrated, costingSession, initSession]);

    // Show brand products when brand filter is clicked with empty query
    useEffect(() => {
        if (!searchQuery.trim() && brandFilter !== "all") {
            const brandProds = products.filter((p) => p.brand.toLowerCase() === brandFilter.toLowerCase());
            setSearchResults(
                brandProds.slice(0, 30).map((product) => ({
                    product,
                    score: 1.0,
                    confidence: 100,
                    matchLabel: "100% Match",
                    matchType: "exact" as const,
                }))
            );
        } else if (!searchQuery.trim()) {
            setSearchResults([]);
        }
    }, [brandFilter, searchQuery, products]);

    // Debounced search with advanced Fuse.js and electrical synonym matching engine
    useEffect(() => {
        if (!searchQuery.trim()) return;
        clearTimeout(searchTimer.current!);
        setSearching(true);
        searchTimer.current = setTimeout(() => {
            const matches = matchPriceListItems(searchQuery, products, {
                brand: brandFilter,
                limit: 35,
            });
            setSearchResults(matches);
            setSearching(false);
        }, 200);
        return () => clearTimeout(searchTimer.current!);
    }, [searchQuery, products, brandFilter]);

    const handleNewCosting = () => {
        if (items.length > 0) { setShowNewWarning(true); return; }
        initSession();
    };

    const confirmNewCosting = () => {
        clearSession();
        initSession();
        setShowNewWarning(false);
        showToast("New costing started");
    };

    const handleDownloadExcel = async () => {
        if (!costingSession) return;
        setDownloading(true);
        try {
            const res = await fetch("/api/excel/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session: costingSession }),
            });
            if (!res.ok) { showToast("❌ Failed to generate Excel"); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Electrical_Master_Costing_${formatDate()}-${header?.reference || "001"}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("✅ Costing Excel downloaded");
        } finally { setDownloading(false); }
    };

    const handleRequirementItemsLoaded = (items: BOQItem[], fileName: string) => {
        setRequirementItems(items);
        setRequirementFileName(fileName);
        setWizardInitialIndex(0);
        setWizardOpen(true);
    };

    const handleOpenWizardAtIndex = (index: number = 0) => {
        setWizardInitialIndex(index);
        setWizardOpen(true);
    };

    const handleClearRequirements = () => {
        setRequirementItems([]);
        setRequirementFileName("");
        showToast("Extracted requirement document cleared");
    };

    const handleAddDirectRequirement = (item: BOQItem) => {
        const spec = parseElectricalQuery(item.description);
        const validBrand = (item.brand && isValidBrandName(item.brand)) ? item.brand : spec.brand;
        const brand = validBrand || "Requirement Specified";
        const code = item.model || (spec.componentType ? `${spec.componentType}-${spec.currentRating || "REQ"}` : `ITEM-${item.lineNo}`);
        const price = item.unitPrice || 0;

        const directProduct: Product = {
            id: `req-direct-${item.id}`,
            productCode: code,
            brand,
            productName: item.description,
            description: item.description,
            listPrice: price,
            discount: 0,
            netCost: price,
            currency: item.currency || curr || "PKR",
            priceListId: "requirement-file",
            category: item.category || spec.componentType || "Requirement Item",
            unit: item.unit || "Pcs",
        };

        addItemToCosting(directProduct, {
            qty: item.qty || 1,
            customDescription: item.description,
        });
        showToast(`✅ Added #${item.lineNo} (${code}) to Costing`);
    };

    const handleAddAllDirectRequirements = () => {
        if (requirementItems.length === 0) return;
        requirementItems.forEach((item) => {
            handleAddDirectRequirement(item);
        });
        showToast(`✅ Added all ${requirementItems.length} items to Costing`);
    };

    const handleConfirmRequirementItem = (product: Product, qty: number, lineNo: number, customDesc?: string) => {
        addItemToCosting(product, {
            qty,
            customDescription: customDesc,
        });
        showToast(`✅ Added ${product.productCode} (${qty}x) to Costing`);
    };

    if (showQuotation) {
        return <QuotationStep onBack={() => setShowQuotation(false)} />;
    }

    return (
        <div className="p-6 sm:p-8 space-y-6 w-full">
            {toast && <div className="toast border-l-4 border-emerald-500 shadow-md">{toast}</div>}

            {/* Warning Modal */}
            {showNewWarning && (
                <Modal onClose={() => setShowNewWarning(false)}>
                    <div className="p-6 space-y-4 max-w-md">
                        <h3 className="text-base font-bold text-foreground">⚠️ Start New Costing?</h3>
                        <p className="text-sm text-muted">
                            Starting a new costing will clear all {items.length} current items. Download your files first.
                        </p>
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button type="button" className="btn-ghost" onClick={() => setShowNewWarning(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleDownloadExcel}
                                disabled={downloading}
                            >
                                {downloading ? "Downloading…" : "📊 Download First"}
                            </button>
                            <button type="button" className="btn-danger" onClick={confirmNewCosting}>
                                Clear & New
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Requirement Guided Review Wizard Modal */}
            {wizardOpen && (
                <RequirementWizard
                    isOpen={wizardOpen}
                    onClose={() => setWizardOpen(false)}
                    rawItems={requirementItems}
                    fileName={requirementFileName}
                    products={products}
                    brands={availableBrands}
                    currency={curr}
                    initialIndex={wizardInitialIndex}
                    onConfirmItem={handleConfirmRequirementItem}
                    onFinished={() => {
                        setWizardOpen(false);
                        showToast("🎉 Finished reviewing requirement items!");
                    }}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <span>🧮</span>
                        <span>New Costing</span>
                    </h1>
                    {products.length === 0 ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>No products loaded.</span>
                            <Link href="/price-lists" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                                Upload a price list first →
                            </Link>
                        </p>
                    ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Search catalog models, configure quantities, adjust margins and calculate client quotations.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" className="btn-ghost" onClick={handleNewCosting}>
                        🔄 New
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                            if (requirementItems.length > 0) {
                                setWizardOpen(true);
                            } else {
                                const input = document.getElementById("requirement-file-upload-input") as HTMLInputElement;
                                if (input) input.click();
                            }
                        }}
                    >
                        <span>📥</span>
                        <span>Upload Requirement</span>
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleDownloadExcel}
                        disabled={downloading || items.length === 0}
                    >
                        <span>📊</span>
                        <span>Download Excel</span>
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setShowQuotation(true)}
                        disabled={items.length === 0}
                    >
                        <span>📄</span>
                        <span>Generate Quotation</span>
                    </button>
                </div>
            </div>

            {/* Project Header */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-all duration-200">
                <div className="text-xl font-semibold text-slate-900 dark:text-white">
                    Project Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="form-group">
                        <label htmlFor="costing-customer-name" className="label">Customer Name</label>
                        <input
                            id="costing-customer-name"
                            className="input"
                            value={header?.customerName ?? ""}
                            onChange={(e) => updateHeader({ customerName: e.target.value })}
                            placeholder="Customer name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-company-name" className="label">Company</label>
                        <input
                            id="costing-company-name"
                            className="input"
                            value={header?.company ?? ""}
                            onChange={(e) => updateHeader({ company: e.target.value })}
                            placeholder="Company"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-project-name" className="label">Project</label>
                        <input
                            id="costing-project-name"
                            className="input"
                            value={header?.project ?? ""}
                            onChange={(e) => updateHeader({ project: e.target.value })}
                            placeholder="Project name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-reference" className="label">Reference</label>
                        <input
                            id="costing-reference"
                            className="input"
                            value={header?.reference ?? ""}
                            onChange={(e) => updateHeader({ reference: e.target.value })}
                            placeholder="e.g. RFQ-2026-001"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-date" className="label">Date</label>
                        <input
                            id="costing-date"
                            className="input"
                            type="date"
                            value={header?.date ?? formatDate()}
                            onChange={(e) => updateHeader({ date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-currency" className="label">Currency</label>
                        <select
                            id="costing-currency"
                            className="select"
                            value={header?.currency ?? "PKR"}
                            onChange={(e) => updateHeader({ currency: e.target.value })}
                        >
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="costing-gst-rate" className="label">GST / Sales Tax</label>
                        <select
                            id="costing-gst-rate"
                            className="select"
                            value={header?.gstRate ?? 0.18}
                            onChange={(e) => updateHeader({ gstRate: parseFloat(e.target.value) })}
                        >
                            <option value={0.18}>18% (Pakistan Standard)</option>
                            <option value={0.17}>17% (Pakistan Prior)</option>
                            <option value={0}>0% (No GST / Exempt)</option>
                            <option value={0.05}>5%</option>
                            <option value={0.1}>10%</option>
                        </select>
                    </div>
                    <div className="form-group sm:col-span-2">
                        <label htmlFor="costing-notes" className="label">Notes</label>
                        <input
                            id="costing-notes"
                            className="input"
                            value={header?.notes ?? ""}
                            onChange={(e) => updateHeader({ notes: e.target.value })}
                            placeholder="Optional notes"
                        />
                    </div>
                </div>
            </div>

            {/* Requirement File Upload & Guided Review */}
            <div className="rounded-2xl border border-blue-500/25 bg-blue-50/40 dark:bg-blue-950/20 p-6 shadow-sm space-y-4 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                            <span>📋 Requirement / BOQ Document Upload</span>
                            <span className="badge badge-blue text-xs">Excel · PDF · Images</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Upload any customer requirement file (spreadsheet, drawing, or photo). System checks models or parses category (MCB, MCCB, ACB), readings (40A, 50A, 3P), and brand, then asks for confirmation on each selected option.
                        </p>
                    </div>
                    {requirementItems.length > 0 && (
                        <button
                            type="button"
                            className="btn-primary shrink-0"
                            onClick={() => setWizardOpen(true)}
                        >
                            <span>⚡</span>
                            <span>Review Items ({requirementItems.length})</span>
                        </button>
                    )}
                </div>

                <RequirementUploader
                    onItemsLoaded={handleRequirementItemsLoaded}
                    showToast={showToast}
                />
            </div>

            {/* Extracted Document Preview & Breakdown Section */}
            {requirementItems.length > 0 && (
                <RequirementPreviewSection
                    items={requirementItems}
                    fileName={requirementFileName}
                    currency={curr}
                    products={products}
                    onOpenWizard={handleOpenWizardAtIndex}
                    onClear={handleClearRequirements}
                    onAddDirectToCosting={handleAddDirectRequirement}
                    onAddAllToCosting={handleAddAllDirectRequirements}
                />
            )}

            {/* Product Search */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-all duration-200">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-xl font-semibold text-slate-900 dark:text-white">
                        Search & Add Products
                    </div>
                    <Link
                        href="/blind-quotation"
                        className="btn-secondary"
                    >
                        <span>⚡</span>
                        <span>Blind Spec Finder (No Model #)</span>
                    </Link>
                </div>
                <div className="relative">
                    <label htmlFor="costing-product-search" className="sr-only">Search products</label>
                    <input
                        id="costing-product-search"
                        className="input pl-11 h-12 text-sm rounded-xl transition-all duration-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search: 250A MCCB · Schneider · ABB 4 pole · MCB 32A · LV431630..."
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    {searching && <div className="spinner absolute right-4 top-1/2 -translate-y-1/2" />}
                </div>

                {availableBrands.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">Filter Brand:</span>
                        <button
                            type="button"
                            className={brandFilter === "all" ? "badge badge-blue cursor-pointer" : "badge badge-gray cursor-pointer"}
                            onClick={() => setBrandFilter("all")}
                        >
                            All Brands
                        </button>
                        {availableBrands.map((b) => (
                            <button
                                key={b}
                                type="button"
                                className={brandFilter.toLowerCase() === b.toLowerCase() ? "badge badge-blue cursor-pointer" : "badge badge-gray cursor-pointer"}
                                onClick={() => setBrandFilter(brandFilter.toLowerCase() === b.toLowerCase() ? "all" : b)}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                )}

                {searching && (
                    <div className="space-y-3 pt-1">
                        <div className="h-16 rounded-xl animate-pulse bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" />
                        <div className="h-16 rounded-xl animate-pulse bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" />
                    </div>
                )}

                {products.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                        No products indexed. Upload a price list first.
                    </div>
                )}

                {!searching && searchResults.length > 0 && (
                    <div className="max-h-80 overflow-y-auto flex flex-col gap-2.5 pr-1">
                        {searchResults.map((r) => (
                            <ProductResultCard
                                key={r.product.id}
                                result={r}
                                currency={curr}
                                onAdd={() => {
                                    addItemToCosting(r.product);
                                    showToast(`✅ ${r.product.productCode} added`);
                                }}
                            />
                        ))}
                    </div>
                )}

                {searchQuery && !searching && searchResults.length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                        No products found for "{searchQuery}". Try the{" "}
                        <Link href="/blind-quotation" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                            ⚡ Blind Quotation Finder
                        </Link>{" "}
                        to search by electrical readings.
                    </div>
                )}
            </div>

            {/* Costing Table */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6 transition-all duration-200">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-xl font-semibold text-slate-900 dark:text-white">
                        Costing Items ({items.length})
                    </div>
                    {items.length > 0 && (
                        <span className="badge badge-blue font-semibold text-xs">
                            {curr} {totals ? new Intl.NumberFormat().format(totals.grandTotal) : 0} incl. GST
                        </span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                        No items added yet. Search for products above or upload a requirement document to add items.
                    </div>
                ) : (
                    <>
                        <div className="table-container rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 z-10 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                                    <tr>
                                        <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 text-center w-12 px-4 py-3.5 shadow-[1px_0_0_0_var(--border)]">#</th>
                                        <th className="px-4 py-3.5">Product Code</th>
                                        <th className="px-4 py-3.5">Brand</th>
                                        <th className="px-4 py-3.5">Description</th>
                                        <th className="px-4 py-3.5">Qty</th>
                                        <th className="px-4 py-3.5">List Price</th>
                                        <th className="px-4 py-3.5">Discount</th>
                                        <th className="px-4 py-3.5">Net Cost</th>
                                        <th className="px-4 py-3.5">Margin</th>
                                        <th className="px-4 py-3.5">Selling Price</th>
                                        <th className="px-4 py-3.5">Total Cost</th>
                                        <th className="px-4 py-3.5">Total Selling</th>
                                        <th className="px-4 py-3.5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <CostingRow
                                            key={item.id}
                                            item={item}
                                            index={i}
                                            currency={curr}
                                            onUpdate={(updates) => updateCostingItem(item.id, updates)}
                                            onRemove={() => removeItemFromCosting(item.id)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mt-6">
                            <div className="min-w-[340px] rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-sm">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Subtotal (Cost)</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(totals?.subtotalCost ?? 0, curr)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Subtotal (Selling)</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(totals?.subtotalSelling ?? 0, curr)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">GST ({Math.round((header?.gstRate ?? 0.18) * 100)}%)</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(totals?.gstAmount ?? 0, curr)}</span>
                                </div>
                                <hr className="divider my-3" />
                                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                                    <span>GRAND TOTAL</span>
                                    <span className="text-blue-600 dark:text-blue-400 text-lg font-extrabold">{formatCurrency(totals?.grandTotal ?? 0, curr)}</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                                    {items.length} items · {totals?.totalQty ?? 0} units · Avg margin {formatPercent(totals?.averageMargin ?? 0)}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ProductResultCard({
    result,
    currency,
    onAdd,
}: {
    result: MatchResult;
    currency: string;
    onAdd: () => void;
}) {
    const { product, confidence, matchLabel, specDetails } = result;

    // Badge color coding based on match confidence
    const badgeColorClass =
        confidence >= 90
            ? "badge-green"
            : confidence >= 75
            ? "badge-blue"
            : "badge-yellow";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-200">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="badge badge-blue">{product.brand}</span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{product.productCode}</span>
                    <span className={`badge font-bold text-xs ${badgeColorClass}`}>
                        {matchLabel || `${confidence}% Match`}
                    </span>
                    {specDetails && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-medium">
                            ⚡ {specDetails}
                        </span>
                    )}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {product.description}
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right whitespace-nowrap">
                    <div className="text-xs text-slate-400 line-through">{formatCurrency(product.listPrice, currency)}</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(product.netCost, currency)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Disc: {formatPercent(product.discount)}</div>
                </div>
                <button className="btn-primary" onClick={onAdd}>+ Add</button>
            </div>
        </div>
    );
}

function CostingRow({ item, index, currency, onUpdate, onRemove }: {
    item: CostingItem;
    index: number;
    currency: string;
    onUpdate: (updates: Partial<CostingItem>) => void;
    onRemove: () => void;
}) {
    return (
        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
            <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3.5 shadow-[1px_0_0_0_var(--border)]">{index + 1}</td>
            <td className="font-semibold text-sm whitespace-nowrap text-slate-900 dark:text-white px-4 py-3.5">{item.product.productCode}</td>
            <td className="px-4 py-3.5"><span className="badge badge-blue">{item.product.brand}</span></td>
            <td className="max-w-[240px] truncate text-sm text-slate-700 dark:text-slate-300 px-4 py-3.5">
                {item.customDescription || item.product.description}
            </td>
            <td className="px-4 py-3.5">
                <input
                    type="number" min="1"
                    aria-label={`Quantity for ${item.product.productCode}`}
                    className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white px-3 py-1.5 text-sm focus:border-blue-500 outline-none transition-all duration-200"
                    value={item.qty}
                    onChange={(e) => onUpdate({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                />
            </td>
            <td className="text-sm text-slate-900 dark:text-white whitespace-nowrap px-4 py-3.5">{formatCurrency(item.listPrice, currency)}</td>
            <td className="whitespace-nowrap px-4 py-3.5">
                <input
                    type="number" min="0" max="100" step="0.5"
                    aria-label={`Discount for ${item.product.productCode}`}
                    className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white px-3 py-1.5 text-sm focus:border-blue-500 outline-none transition-all duration-200"
                    value={Math.round(item.discount * 100)}
                    onChange={(e) => onUpdate({ discount: Math.min(1, Math.max(0, parseFloat(e.target.value) / 100 || 0)) })}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">%</span>
            </td>
            <td className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap px-4 py-3.5">{formatCurrency(item.netCost, currency)}</td>
            <td className="whitespace-nowrap px-4 py-3.5">
                <input
                    type="number" min="0" max="200" step="0.5"
                    aria-label={`Margin for ${item.product.productCode}`}
                    className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white px-3 py-1.5 text-sm focus:border-blue-500 outline-none transition-all duration-200"
                    value={Math.round(item.margin * 100)}
                    onChange={(e) => onUpdate({ margin: Math.max(0, parseFloat(e.target.value) / 100 || 0) })}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">%</span>
            </td>
            <td className="text-sm text-slate-900 dark:text-white whitespace-nowrap px-4 py-3.5">{formatCurrency(item.sellingPrice, currency)}</td>
            <td className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap px-4 py-3.5">{formatCurrency(item.totalCost, currency)}</td>
            <td className="font-bold text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap px-4 py-3.5">{formatCurrency(item.totalSelling, currency)}</td>
            <td className="text-center px-4 py-3.5">
                <button
                    type="button"
                    aria-label={`Remove ${item.product.productCode}`}
                    className="btn-danger px-3 py-1.5 rounded-xl text-xs"
                    onClick={onRemove}
                >
                    ✕
                </button>
            </td>
        </tr>
    );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={onClose}>
            <div className="bg-card-bg rounded-2xl border border-card-border shadow-2xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

function QuotationStep({ onBack }: { onBack: () => void }) {
    const { costingSession, createQuotation, quotation } = useEmsStore();
    const [contact, setContact] = useState({
        customerName: costingSession?.header.customerName ?? "",
        company: costingSession?.header.company ?? "",
        address: "",
        phone: "",
        email: "",
    });
    const [meta, setMeta] = useState({
        paymentTerms: "30 days net",
        deliveryTerms: "EXW",
        notes: "",
        termsAndConditions: "All prices are subject to change without prior notice. Availability is subject to stock at time of order.",
    });
    const [generated, setGenerated] = useState(false);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    const handleGenerate = () => {
        createQuotation(contact, meta);
        setGenerated(true);
        showToast("✅ Quotation generated");
    };

    const handleDownloadPDF = async () => {
        if (!quotation) return;
        setDownloadingPDF(true);
        try {
            const res = await fetch("/api/quotation/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quotation }),
            });
            if (!res.ok) { showToast("❌ Failed to generate PDF"); return; }
            const html = await res.text();
            const win = window.open("", "_blank");
            if (win) { win.document.write(html); win.document.close(); }
        } finally { setDownloadingPDF(false); }
    };

    const curr = costingSession?.header.currency ?? "PKR";
    const items = costingSession?.items ?? [];
    const totals = costingSession?.totals;

    return (
        <div className="p-6 sm:p-8 space-y-6 w-full">
            {toast && <div className="toast border-l-4 border-emerald-500 shadow-md">{toast}</div>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
                <div>
                    <button type="button" className="btn-ghost btn-sm mb-2" onClick={onBack}>
                        ← Back to Costing
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>📄</span>
                        <span>Generate Quotation</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {generated && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleDownloadPDF}
                            disabled={downloadingPDF}
                        >
                            {downloadingPDF ? "Opening…" : "📄 Download PDF"}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Details */}
                <div className="card space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Customer Details
                    </div>
                    {[
                        { id: "quote-customer-name", key: "customerName", label: "Customer Name", placeholder: "e.g. John Smith" },
                        { id: "quote-company-name", key: "company", label: "Company", placeholder: "e.g. ABC Electrical Contractors" },
                        { id: "quote-address", key: "address", label: "Address", placeholder: "e.g. Plot 12, Industrial Area, Karachi" },
                        { id: "quote-phone", key: "phone", label: "Phone", placeholder: "e.g. +92 300 1234567" },
                        { id: "quote-email", key: "email", label: "Email", placeholder: "e.g. procurement@abcelectrical.com" },
                    ].map(({ id, key, label, placeholder }) => (
                        <div key={key} className="form-group">
                            <label htmlFor={id} className="label">{label}</label>
                            <input
                                id={id}
                                className="input"
                                value={contact[key as keyof typeof contact]}
                                onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
                                placeholder={placeholder}
                            />
                        </div>
                    ))}
                </div>

                {/* Quotation Terms */}
                <div className="card space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Quotation Terms
                    </div>
                    <div className="form-group">
                        <label htmlFor="quote-payment-terms" className="label">Payment Terms</label>
                        <input
                            id="quote-payment-terms"
                            className="input"
                            value={meta.paymentTerms}
                            onChange={(e) => setMeta({ ...meta, paymentTerms: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="quote-delivery-terms" className="label">Delivery Terms</label>
                        <input
                            id="quote-delivery-terms"
                            className="input"
                            value={meta.deliveryTerms}
                            onChange={(e) => setMeta({ ...meta, deliveryTerms: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="quote-notes" className="label">Notes</label>
                        <textarea
                            id="quote-notes"
                            className="input resize-y min-h-[72px]"
                            value={meta.notes}
                            onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
                            rows={3}
                            placeholder="Optional notes for the customer"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="quote-terms-conditions" className="label">Terms & Conditions</label>
                        <textarea
                            id="quote-terms-conditions"
                            className="input resize-y min-h-[96px]"
                            value={meta.termsAndConditions}
                            onChange={(e) => setMeta({ ...meta, termsAndConditions: e.target.value })}
                            rows={4}
                        />
                    </div>
                </div>
            </div>

            {/* Costing Summary */}
            <div className="card space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    Quotation Items ({items.length})
                </div>
                <div className="table-container rounded-xl border border-border shadow-2xs overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-muted-bg z-10 border-b border-border shadow-2xs">
                            <tr>
                                <th className="sticky left-0 z-20 bg-muted-bg text-center w-12 px-4 py-3 shadow-[1px_0_0_0_var(--border)]">#</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Brand</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3">Unit Price</th>
                                <th className="px-4 py-3">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={item.id} className="hover:bg-muted-bg/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted px-4 py-3 shadow-[1px_0_0_0_var(--border)]">{i + 1}</td>
                                    <td className="font-semibold text-xs whitespace-nowrap text-foreground px-4 py-3">{item.product.productCode}</td>
                                    <td className="px-4 py-3"><span className="badge badge-blue">{item.product.brand}</span></td>
                                    <td className="text-xs text-foreground px-4 py-3">{item.product.description}</td>
                                    <td className="text-xs px-4 py-3">{item.qty}</td>
                                    <td className="text-xs whitespace-nowrap px-4 py-3">{formatCurrency(item.sellingPrice, curr)}</td>
                                    <td className="font-semibold text-xs text-accent whitespace-nowrap px-4 py-3">{formatCurrency(item.totalSelling, curr)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end pt-2">
                    <div className="min-w-[300px] rounded-xl bg-muted-bg/80 border border-border/70 p-5 space-y-2.5">
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted">Subtotal</span>
                            <span className="font-medium text-foreground">{formatCurrency(totals?.subtotalSelling ?? 0, curr)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted">GST ({Math.round((costingSession?.header.gstRate ?? 0.18) * 100)}%)</span>
                            <span className="font-medium text-foreground">{formatCurrency(totals?.gstAmount ?? 0, curr)}</span>
                        </div>
                        <hr className="divider my-1 border-border/60" />
                        <div className="flex justify-between text-base font-bold text-foreground">
                            <span>TOTAL</span>
                            <span className="text-accent">{formatCurrency(totals?.grandTotal ?? 0, curr)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
                <button
                    type="button"
                    className="btn-primary px-8 py-2.5 text-sm font-semibold"
                    onClick={handleGenerate}
                >
                    🧾 Generate Quotation
                </button>
                {generated && (
                    <button
                        type="button"
                        className="btn-success px-8 py-2.5 text-sm font-semibold"
                        onClick={handleDownloadPDF}
                        disabled={downloadingPDF}
                    >
                        {downloadingPDF ? "Opening…" : "📄 Download PDF"}
                    </button>
                )}
            </div>
        </div>
    );
}

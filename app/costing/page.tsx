"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEmsStore, useHasHydrated } from "@/stores/appStore";
import { searchProducts } from "@/lib/search/productSearch";
import { matchBlindQuotation, parseElectricalQuery } from "@/lib/search/blindQuotation";
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
    const [searchResults, setSearchResults] = useState<(SearchResult & { specDetails?: string })[]>([]);
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
                    score: 1,
                    matchType: "exact" as const,
                }))
            );
        } else if (!searchQuery.trim()) {
            setSearchResults([]);
        }
    }, [brandFilter, searchQuery, products]);

    // Debounced search with Blind Quotation & Spec support
    useEffect(() => {
        if (!searchQuery.trim()) return;
        clearTimeout(searchTimer.current!);
        setSearching(true);
        searchTimer.current = setTimeout(() => {
            // First perform standard search
            const standardResults = searchProducts(searchQuery, products, 30);

            // Also perform Blind Spec matching (for Brand + Readings queries like "Schneider 250A 3P 36kA")
            const blindResults = matchBlindQuotation(searchQuery, products, 20);

            // Merge results without duplicates, prioritizing high blind matches if relevant
            const seenIds = new Set<string>();
            const merged: (SearchResult & { specDetails?: string })[] = [];

            // Add high-confidence blind results first if query has electrical readings
            const spec = parseElectricalQuery(searchQuery);
            const hasElectricalSpec = spec.currentNumeric || spec.poles || spec.breakingCapacityNumeric || spec.componentType;

            if (hasElectricalSpec && blindResults.length > 0) {
                for (const br of blindResults) {
                    if (!seenIds.has(br.product.id)) {
                        seenIds.add(br.product.id);
                        merged.push({
                            product: br.product,
                            score: br.score,
                            matchType: br.score >= 0.8 ? "exact" : "fuzzy",
                            specDetails: br.matchedSpecsSummary,
                        });
                    }
                }
            }

            // Then append standard results
            for (const sr of standardResults) {
                if (!seenIds.has(sr.product.id)) {
                    seenIds.add(sr.product.id);
                    merged.push(sr);
                }
            }

            const filteredMerged = brandFilter === "all"
                ? merged
                : merged.filter((r) => r.product.brand.toLowerCase() === brandFilter.toLowerCase());

            setSearchResults(filteredMerged.slice(0, 35));
            setSearching(false);
        }, 250);
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
        <div style={{ padding: "28px 32px", maxWidth: "100%" }}>
            {toast && <div className="toast" style={{ borderLeft: "3px solid var(--success)" }}>{toast}</div>}

            {/* Warning Modal */}
            {showNewWarning && (
                <Modal onClose={() => setShowNewWarning(false)}>
                    <div style={{ padding: "24px", maxWidth: "420px" }}>
                        <h3 style={{ fontWeight: 700, fontSize: "16px", marginBottom: "10px" }}>⚠️ Start New Costing?</h3>
                        <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
                            Starting a new costing will clear all {items.length} current items. Download your files first.
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowNewWarning(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleDownloadExcel} disabled={downloading}>
                                {downloading ? "Downloading…" : "📊 Download First"}
                            </button>
                            <button className="btn-danger" onClick={confirmNewCosting}>Clear & New</button>
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

            <div className="page-header">
                <div>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>🧮 New Costing</h1>
                    {products.length === 0 && (
                        <p style={{ color: "var(--warning)", fontSize: "13px", marginTop: "4px" }}>
                            ⚠️ No products loaded. <a href="/price-lists" style={{ color: "var(--accent)" }}>Upload a price list first →</a>
                        </p>
                    )}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button className="btn-ghost btn-sm" onClick={handleNewCosting}>🔄 New</button>
                    <button
                        className="btn-primary btn-sm"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                            border: "none",
                        }}
                        onClick={() => {
                            if (requirementItems.length > 0) {
                                setWizardOpen(true);
                            } else {
                                const input = document.getElementById("requirement-file-upload-input") as HTMLInputElement;
                                if (input) input.click();
                            }
                        }}
                    >
                        📥 Upload Requirement
                    </button>
                    <button className="btn-secondary" onClick={handleDownloadExcel} disabled={downloading || items.length === 0}>
                        📊 Download Excel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowQuotation(true)}
                        disabled={items.length === 0}
                    >
                        📄 Generate Quotation
                    </button>
                </div>
            </div>

            {/* Project Header */}
            <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Project Details
                </div>
                <div className="grid-3" style={{ gap: "12px" }}>
                    <div className="form-group">
                        <label className="label">Customer Name</label>
                        <input className="input" value={header?.customerName ?? ""} onChange={(e) => updateHeader({ customerName: e.target.value })} placeholder="Customer name" />
                    </div>
                    <div className="form-group">
                        <label className="label">Company</label>
                        <input className="input" value={header?.company ?? ""} onChange={(e) => updateHeader({ company: e.target.value })} placeholder="Company" />
                    </div>
                    <div className="form-group">
                        <label className="label">Project</label>
                        <input className="input" value={header?.project ?? ""} onChange={(e) => updateHeader({ project: e.target.value })} placeholder="Project name" />
                    </div>
                    <div className="form-group">
                        <label className="label">Reference</label>
                        <input className="input" value={header?.reference ?? ""} onChange={(e) => updateHeader({ reference: e.target.value })} placeholder="e.g. RFQ-2026-001" />
                    </div>
                    <div className="form-group">
                        <label className="label">Date</label>
                        <input className="input" type="date" value={header?.date ?? formatDate()} onChange={(e) => updateHeader({ date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Currency</label>
                        <select className="select" value={header?.currency ?? "PKR"} onChange={(e) => updateHeader({ currency: e.target.value })}>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">GST / Sales Tax</label>
                        <select className="select" value={header?.gstRate ?? 0.18} onChange={(e) => updateHeader({ gstRate: parseFloat(e.target.value) })}>
                            <option value={0.18}>18% (Pakistan Standard)</option>
                            <option value={0.17}>17% (Pakistan Prior)</option>
                            <option value={0}>0% (No GST / Exempt)</option>
                            <option value={0.05}>5%</option>
                            <option value={0.1}>10%</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="label">Notes</label>
                        <input className="input" value={header?.notes ?? ""} onChange={(e) => updateHeader({ notes: e.target.value })} placeholder="Optional notes" />
                    </div>
                </div>
            </div>

            {/* Requirement File Upload & Guided Review */}
            <div className="card" style={{ marginBottom: "20px", border: "1px solid rgba(59, 130, 246, 0.25)", background: "linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, transparent 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>📋 Requirement / BOQ Document Upload</span>
                            <span className="badge badge-blue" style={{ fontSize: "11px" }}>Excel · PDF · Images</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                            Upload any requirement file (spreadsheet, drawing, or photo). System checks models or parses category (MCB, MCCB, ACB), readings (40A, 50A, 3P), and brand, then asks for confirmation on each selected option.
                        </p>
                    </div>
                    {requirementItems.length > 0 && (
                        <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => setWizardOpen(true)}
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            ⚡ Review Items ({requirementItems.length})
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
            <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Search & Add Products
                    </div>
                    <Link
                        href="/blind-quotation"
                        className="btn-secondary btn-sm"
                        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                    >
                        ⚡ Blind Spec Finder (No Model #)
                    </Link>
                </div>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                    <input
                        className="input"
                        style={{ paddingLeft: "36px", fontSize: "15px", height: "44px" }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search: 250A MCCB · Schneider · ABB 4 pole · MCB 32A · LV431630..."
                    />
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>🔍</span>
                    {searching && <div className="spinner" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />}
                </div>

                {availableBrands.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "2px" }}>Filter Brand:</span>
                        <button
                            type="button"
                            className={brandFilter === "all" ? "badge badge-blue" : "badge badge-gray"}
                            style={{ cursor: "pointer", border: "none", padding: "4px 8px" }}
                            onClick={() => setBrandFilter("all")}
                        >
                            All Brands
                        </button>
                        {availableBrands.map((b) => (
                            <button
                                key={b}
                                type="button"
                                className={brandFilter.toLowerCase() === b.toLowerCase() ? "badge badge-blue" : "badge badge-gray"}
                                style={{ cursor: "pointer", border: "none", padding: "4px 8px" }}
                                onClick={() => setBrandFilter(brandFilter.toLowerCase() === b.toLowerCase() ? "all" : b)}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                )}
                {products.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "13px" }}>
                        No products indexed. Upload a price list first.
                    </div>
                )}
                {searchResults.length > 0 && (
                    <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {searchResults.map((r) => (
                            <ProductResultCard key={r.product.id} result={r} currency={curr} onAdd={() => {
                                addItemToCosting(r.product);
                                showToast(`✅ ${r.product.productCode} added`);
                            }} />
                        ))}
                    </div>
                )}
                {searchQuery && !searching && searchResults.length === 0 && (
                    <div style={{ textAlign: "center", padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
                        No products found for "{searchQuery}". Try the <Link href="/blind-quotation" style={{ color: "var(--accent)" }}>⚡ Blind Quotation Finder</Link> to search by electrical readings.
                    </div>
                )}
            </div>

            {/* Costing Table */}
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Costing Items ({items.length})
                    </div>
                    {items.length > 0 && (
                        <span className="badge badge-blue">{curr} {totals ? new Intl.NumberFormat().format(totals.grandTotal) : 0} incl. GST</span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-10 text-muted text-sm">
                        No items added yet. Search for products above or upload a requirement document to add items.
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 z-20 bg-muted-bg text-center w-10 shadow-[1px_0_0_0_var(--border)]">#</th>
                                        <th>Product Code</th>
                                        <th>Brand</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>List Price</th>
                                        <th>Discount</th>
                                        <th>Net Cost</th>
                                        <th>Margin</th>
                                        <th>Selling Price</th>
                                        <th>Total Cost</th>
                                        <th>Total Selling</th>
                                        <th></th>
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
                        <div className="flex justify-end mt-4">
                            <div className="min-w-[300px] rounded-xl bg-muted-bg/80 border border-border/70 p-4 space-y-2">
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-muted">Subtotal (Cost)</span>
                                    <span className="font-medium text-foreground">{formatCurrency(totals?.subtotalCost ?? 0, curr)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-muted">Subtotal (Selling)</span>
                                    <span className="font-medium text-foreground">{formatCurrency(totals?.subtotalSelling ?? 0, curr)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                    <span className="text-muted">GST ({Math.round((header?.gstRate ?? 0.1) * 100)}%)</span>
                                    <span className="font-medium text-foreground">{formatCurrency(totals?.gstAmount ?? 0, curr)}</span>
                                </div>
                                <hr className="divider my-2" />
                                <div className="flex justify-between text-base font-bold text-foreground">
                                    <span>GRAND TOTAL</span>
                                    <span className="text-accent">{formatCurrency(totals?.grandTotal ?? 0, curr)}</span>
                                </div>
                                <div className="text-xs text-muted text-right">
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

function ProductResultCard({ result, currency, onAdd }: { result: SearchResult & { specDetails?: string }; currency: string; onAdd: () => void }) {
    const { product, score, matchType, specDetails } = result;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted-bg/60 rounded-xl p-3 border border-border/80 hover:border-accent/40 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="badge badge-blue">{product.brand}</span>
                    <span className="font-semibold text-xs text-foreground">{product.productCode}</span>
                    <span className={`badge ${matchType === "exact" ? "badge-green" : matchType === "partial" ? "badge-blue" : "badge-gray"}`}>
                        {Math.round(score * 100)}% {matchType}
                    </span>
                    {specDetails && (
                        <span className="text-[11px] bg-emerald-500/10 text-success border border-success/20 px-1.5 py-0.5 rounded-sm font-medium">
                            ⚡ {specDetails}
                        </span>
                    )}
                </div>
                <div className="text-xs text-muted truncate">
                    {product.description}
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="text-right whitespace-nowrap">
                    <div className="text-xs text-muted line-through">{formatCurrency(product.listPrice, currency)}</div>
                    <div className="font-bold text-sm text-success">{formatCurrency(product.netCost, currency)}</div>
                    <div className="text-[11px] text-muted">Disc: {formatPercent(product.discount)}</div>
                </div>
                <button className="btn-primary btn-sm" onClick={onAdd}>+ Add</button>
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
        <tr className="hover:bg-muted-bg/50 transition-colors">
            <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted shadow-[1px_0_0_0_var(--border)]">{index + 1}</td>
            <td className="font-semibold text-xs whitespace-nowrap text-foreground">{item.product.productCode}</td>
            <td><span className="badge badge-blue">{item.product.brand}</span></td>
            <td className="max-w-[200px] truncate text-xs text-foreground">
                {item.customDescription || item.product.description}
            </td>
            <td>
                <input
                    type="number" min="1"
                    className="w-16 bg-input-bg border border-input-border rounded-md text-foreground px-1.5 py-1 text-xs focus:border-accent outline-none"
                    value={item.qty}
                    onChange={(e) => onUpdate({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                />
            </td>
            <td className="text-xs text-foreground whitespace-nowrap">{formatCurrency(item.listPrice, currency)}</td>
            <td className="whitespace-nowrap">
                <input
                    type="number" min="0" max="100" step="0.5"
                    className="w-16 bg-input-bg border border-input-border rounded-md text-foreground px-1.5 py-1 text-xs focus:border-accent outline-none"
                    value={Math.round(item.discount * 100)}
                    onChange={(e) => onUpdate({ discount: Math.min(1, Math.max(0, parseFloat(e.target.value) / 100 || 0)) })}
                />
                <span className="text-[11px] text-muted ml-1">%</span>
            </td>
            <td className="font-semibold text-xs text-success whitespace-nowrap">{formatCurrency(item.netCost, currency)}</td>
            <td className="whitespace-nowrap">
                <input
                    type="number" min="0" max="200" step="0.5"
                    className="w-16 bg-input-bg border border-input-border rounded-md text-foreground px-1.5 py-1 text-xs focus:border-accent outline-none"
                    value={Math.round(item.margin * 100)}
                    onChange={(e) => onUpdate({ margin: Math.max(0, parseFloat(e.target.value) / 100 || 0) })}
                />
                <span className="text-[11px] text-muted ml-1">%</span>
            </td>
            <td className="text-xs text-foreground whitespace-nowrap">{formatCurrency(item.sellingPrice, currency)}</td>
            <td className="text-xs text-muted whitespace-nowrap">{formatCurrency(item.totalCost, currency)}</td>
            <td className="font-bold text-xs text-accent whitespace-nowrap">{formatCurrency(item.totalSelling, currency)}</td>
            <td className="text-center">
                <button className="btn-danger btn-sm px-2 py-1" onClick={onRemove}>✕</button>
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

    const curr = costingSession?.header.currency ?? "AUD";
    const items = costingSession?.items ?? [];
    const totals = costingSession?.totals;

    return (
        <div style={{ padding: "28px 32px" }}>
            {toast && <div className="toast" style={{ borderLeft: "3px solid var(--success)" }}>{toast}</div>}
            <div className="page-header">
                <div>
                    <button className="btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: "8px" }}>← Back to Costing</button>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>📄 Generate Quotation</h1>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {generated && (
                        <>
                            <button className="btn-primary" onClick={handleDownloadPDF} disabled={downloadingPDF}>
                                {downloadingPDF ? "Opening…" : "📄 Download PDF"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
                {/* Customer Details */}
                <div className="card">
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Customer Details</div>
                    {[
                        { key: "customerName", label: "Customer Name", placeholder: "John Smith" },
                        { key: "company", label: "Company", placeholder: "ABC Electrical Contractors" },
                        { key: "address", label: "Address", placeholder: "123 Main St, Sydney NSW 2000" },
                        { key: "phone", label: "Phone", placeholder: "+61 2 1234 5678" },
                        { key: "email", label: "Email", placeholder: "john@abcelectrical.com.au" },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key} className="form-group" style={{ marginBottom: "10px" }}>
                            <label className="label">{label}</label>
                            <input className="input" value={contact[key as keyof typeof contact]} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} placeholder={placeholder} />
                        </div>
                    ))}
                </div>

                {/* Quotation Terms */}
                <div className="card">
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Quotation Terms</div>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                        <label className="label">Payment Terms</label>
                        <input className="input" value={meta.paymentTerms} onChange={(e) => setMeta({ ...meta, paymentTerms: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                        <label className="label">Delivery Terms</label>
                        <input className="input" value={meta.deliveryTerms} onChange={(e) => setMeta({ ...meta, deliveryTerms: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                        <label className="label">Notes</label>
                        <textarea className="input" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} rows={3} style={{ resize: "vertical" }} placeholder="Optional notes for the customer" />
                    </div>
                    <div className="form-group">
                        <label className="label">Terms & Conditions</label>
                        <textarea className="input" value={meta.termsAndConditions} onChange={(e) => setMeta({ ...meta, termsAndConditions: e.target.value })} rows={4} style={{ resize: "vertical" }} />
                    </div>
                </div>
            </div>

            {/* Costing Summary */}
            <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                    Quotation Items ({items.length})
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 bg-muted-bg text-center w-10 shadow-[1px_0_0_0_var(--border)]">#</th>
                                <th>Code</th><th>Brand</th><th>Description</th>
                                <th>Qty</th><th>Unit Price</th><th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={item.id} className="hover:bg-muted-bg/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted shadow-[1px_0_0_0_var(--border)]">{i + 1}</td>
                                    <td className="font-semibold text-xs whitespace-nowrap text-foreground">{item.product.productCode}</td>
                                    <td><span className="badge badge-blue">{item.product.brand}</span></td>
                                    <td className="text-xs text-foreground">{item.product.description}</td>
                                    <td className="text-xs">{item.qty}</td>
                                    <td className="text-xs whitespace-nowrap">{formatCurrency(item.sellingPrice, curr)}</td>
                                    <td className="font-semibold text-xs text-accent whitespace-nowrap">{formatCurrency(item.totalSelling, curr)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                    <div style={{ minWidth: "280px", background: "var(--muted-bg)", borderRadius: "10px", padding: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                            <span style={{ color: "var(--muted)" }}>Subtotal</span>
                            <span>{formatCurrency(totals?.subtotalSelling ?? 0, curr)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                            <span style={{ color: "var(--muted)" }}>GST ({Math.round((costingSession?.header.gstRate ?? 0.1) * 100)}%)</span>
                            <span>{formatCurrency(totals?.gstAmount ?? 0, curr)}</span>
                        </div>
                        <hr className="divider" style={{ margin: "8px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700 }}>
                            <span>TOTAL</span>
                            <span style={{ color: "var(--accent)" }}>{formatCurrency(totals?.grandTotal ?? 0, curr)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                <button className="btn-primary" style={{ padding: "12px 32px", fontSize: "15px" }} onClick={handleGenerate}>
                    🧾 Generate Quotation
                </button>
                {generated && (
                    <button className="btn-success" style={{ padding: "12px 32px", fontSize: "15px" }} onClick={handleDownloadPDF} disabled={downloadingPDF}>
                        {downloadingPDF ? "Opening…" : "📄 Download PDF"}
                    </button>
                )}
            </div>
        </div>
    );
}

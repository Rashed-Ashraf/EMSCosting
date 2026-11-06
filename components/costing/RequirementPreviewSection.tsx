"use client";

import { useState, useMemo } from "react";
import { parseElectricalQuery } from "@/lib/search/blindQuotation";
import { formatCurrency } from "@/lib/calculations";
import type { BOQItem, Product } from "@/lib/types";

interface RequirementPreviewSectionProps {
    items: BOQItem[];
    fileName: string;
    currency?: string;
    products?: Product[];
    onOpenWizard: (initialIndex?: number) => void;
    onClear: () => void;
    onAddDirectToCosting: (item: BOQItem) => void;
    onAddAllToCosting: () => void;
}

export default function RequirementPreviewSection({
    items,
    fileName,
    currency = "PKR",
    products = [],
    onOpenWizard,
    onClear,
    onAddDirectToCosting,
    onAddAllToCosting,
}: RequirementPreviewSectionProps) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isInvalidBrand = (b?: string | null): boolean => {
        if (!b) return true;
        const clean = b.trim();
        if (clean.length < 2) return true;
        if (/^\d+(\.\d+)?$/.test(clean)) return true;
        if (/^\d+(\.\d+)?\s*(?:a|amp|amps|amperes|v|volt|volts|vac|vdc|ka|kw|hp|hz|p|pole|poles|kva|kvar)\b/i.test(clean)) return true;
        if (/^\d+\s*[\/:]\s*\d+/.test(clean)) return true;
        if (/^(?:pcs|pc|nos|no|set|ea|each|lot|meter|m|pack|box|n\/?a|nil|null|none|-|--)$/i.test(clean)) return true;
        return false;
    };

    // Collect unique categories & brands present in extracted items
    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const it of items) {
            const cat = it.category || parseElectricalQuery(it.description).componentType;
            if (cat) set.add(cat);
        }
        return Array.from(set).sort();
    }, [items]);

    const brands = useMemo(() => {
        const set = new Set<string>();
        for (const it of items) {
            const rawB = it.brand && !isInvalidBrand(it.brand) ? it.brand : undefined;
            const b = rawB || parseElectricalQuery(it.description).brand;
            if (b && !isInvalidBrand(b)) set.add(b);
        }
        return Array.from(set).sort();
    }, [items]);

    // Financial totals & counts
    const totalDocumentPrice = useMemo(() => {
        return items.reduce((sum, it) => {
            if (typeof it.totalPrice === "number" && it.totalPrice > 0) {
                return sum + it.totalPrice;
            }
            if (typeof it.unitPrice === "number" && it.unitPrice > 0) {
                return sum + it.unitPrice * (it.qty || 1);
            }
            // Check catalog price for model
            const cleanModel = (it.model || "").toLowerCase().replace(/[\s\-_]/g, "");
            if (cleanModel && products.length > 0) {
                const match = products.find((p) => {
                    const pCode = p.productCode.toLowerCase().replace(/[\s\-_]/g, "");
                    return (pCode === cleanModel || pCode.includes(cleanModel) || cleanModel.includes(pCode)) && (p.netCost > 0 || p.listPrice > 0);
                });
                if (match) {
                    return sum + (match.netCost || match.listPrice) * (it.qty || 1);
                }
            }
            return sum;
        }, 0);
    }, [items, products]);

    const pricedCount = useMemo(() => {
        return items.filter((it) => {
            if (typeof it.unitPrice === "number" && it.unitPrice > 0) return true;
            const cleanModel = (it.model || "").toLowerCase().replace(/[\s\-_]/g, "");
            if (cleanModel && products.length > 0) {
                return products.some((p) => {
                    const pCode = p.productCode.toLowerCase().replace(/[\s\-_]/g, "");
                    return (pCode === cleanModel || pCode.includes(cleanModel) || cleanModel.includes(pCode)) && (p.netCost > 0 || p.listPrice > 0);
                });
            }
            return false;
        }).length;
    }, [items, products]);

    const identifiedModelsCount = useMemo(() => {
        return items.filter((it) => it.model || (it.brand && !isInvalidBrand(it.brand))).length;
    }, [items]);

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const q = search.toLowerCase().trim();
            const spec = parseElectricalQuery(item.description);
            const effectiveCategory = item.category || spec.componentType || "";
            const rawB = item.brand && !isInvalidBrand(item.brand) ? item.brand : undefined;
            const effectiveBrand = rawB || spec.brand || "";

            if (selectedCategory !== "all" && effectiveCategory.toLowerCase() !== selectedCategory.toLowerCase()) {
                return false;
            }

            if (selectedBrand !== "all" && effectiveBrand.toLowerCase() !== selectedBrand.toLowerCase()) {
                return false;
            }

            if (q) {
                const text = `${item.description} ${item.model || ""} ${item.brand || ""} ${effectiveCategory}`.toLowerCase();
                if (!text.includes(q)) return false;
            }

            return true;
        });
    }, [items, search, selectedCategory, selectedBrand]);

    if (!items || items.length === 0) return null;

    return (
        <div
            className="card"
            style={{
                marginBottom: "24px",
                border: "1.5px solid rgba(59, 130, 246, 0.4)",
                background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, var(--card) 100%)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                padding: "20px 24px",
            }}
        >
            {/* Header & Controls */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                }}
            >
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "24px" }}>📋</span>
                        <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                            Extracted Requirement & Price Preview
                        </h2>
                        <span className="badge badge-purple" style={{ fontSize: "12px", fontWeight: 600 }}>
                            {fileName || "Uploaded Document"}
                        </span>
                        <span className="badge badge-green" style={{ fontSize: "12px" }}>
                            {items.length} Items Analyzed
                        </span>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px", marginBottom: 0 }}>
                        Review all extracted electrical requirements, identified models, quantities, and mentioned prices in PKR before or alongside costing.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => onOpenWizard(0)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: 700,
                            padding: "6px 14px",
                            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                        }}
                    >
                        ⚡ Launch Selection Wizard
                    </button>
                    <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={onAddAllToCosting}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        title="Add all extracted items with their mentioned models and prices directly to costing"
                    >
                        ➕ Add All to Costing
                    </button>
                    <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{ fontSize: "12px" }}
                    >
                        {isCollapsed ? "▼ Show Details" : "▲ Minimize"}
                    </button>
                    <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={onClear}
                        style={{ color: "var(--danger)", fontSize: "12px" }}
                        title="Clear extracted document"
                    >
                        🗑️ Clear
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${isCollapsed ? "" : "mb-4"}`}>
                <div className="bg-muted-bg/70 p-3 rounded-xl border border-border/80">
                    <div className="text-[11px] text-muted uppercase font-semibold">Total Items</div>
                    <div className="text-lg font-extrabold text-foreground mt-0.5">
                        {items.length} Lines
                    </div>
                </div>

                <div className="bg-muted-bg/70 p-3 rounded-xl border border-border/80">
                    <div className="text-[11px] text-muted uppercase font-semibold">Identified Brand/Model</div>
                    <div className="text-lg font-extrabold text-accent mt-0.5">
                        {identifiedModelsCount} of {items.length}
                    </div>
                </div>

                <div className="bg-muted-bg/70 p-3 rounded-xl border border-border/80">
                    <div className="text-[11px] text-muted uppercase font-semibold">Mentioned Prices in Document</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {pricedCount} Items Priced
                    </div>
                </div>

                <div className="bg-muted-bg/70 p-3 rounded-xl border border-border/80">
                    <div className="text-[11px] text-muted uppercase font-semibold">Total Mentioned Document Value</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(totalDocumentPrice, currency)}
                    </div>
                </div>
            </div>

            {/* Table & Filtering */}
            {!isCollapsed && (
                <>
                    {/* Filters */}
                    <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                        <div className="flex-1 min-w-[220px] relative">
                            <input
                                className="input pl-8 h-9 text-xs"
                                placeholder="Search by description, model, rating (e.g. 200A, NXM-250S)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
                                🔍
                            </span>
                        </div>

                        {categories.length > 0 && (
                            <select
                                className="select h-9 text-xs min-w-[140px]"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Categories ({categories.length})</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        )}

                        {brands.length > 0 && (
                            <select
                                className="select h-9 text-xs min-w-[130px]"
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                            >
                                <option value="all">All Brands ({brands.length})</option>
                                {brands.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        )}

                        {(search || selectedCategory !== "all" || selectedBrand !== "all") && (
                            <button
                                type="button"
                                className="btn-ghost btn-sm text-xs"
                                onClick={() => {
                                    setSearch("");
                                    setSelectedCategory("all");
                                    setSelectedBrand("all");
                                }}
                            >
                                ✕ Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Extracted Items Table */}
                    <div className="table-container max-h-96 overflow-y-auto rounded-xl border border-border shadow-2xs">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-muted-bg z-10 border-b border-border shadow-2xs">
                                <tr>
                                    <th className="sticky left-0 z-20 bg-muted-bg text-center w-10 px-3 py-2.5 shadow-[1px_0_0_0_var(--border)]">#</th>
                                    <th className="px-3 py-2.5">Category</th>
                                    <th className="px-3 py-2.5">Specification / Requirement</th>
                                    <th className="px-3 py-2.5">Brand / Model</th>
                                    <th className="px-3 py-2.5">Specs</th>
                                    <th className="px-3 py-2.5 text-center">Qty</th>
                                    <th className="px-3 py-2.5 text-right">Unit Price ({currency})</th>
                                    <th className="px-3 py-2.5 text-right">Total Price ({currency})</th>
                                    <th className="px-3 py-2.5 text-center w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, idx) => {
                                    const origIndex = items.findIndex((orig) => orig.id === item.id);
                                    const spec = parseElectricalQuery(item.description);
                                    const effectiveCat = item.category || spec.componentType;
                                    const rawB = item.brand && !isInvalidBrand(item.brand) ? item.brand : undefined;
                                    const effectiveBrand = rawB || spec.brand;
                                    const effectiveModel = item.model && item.model !== effectiveBrand ? item.model : undefined;
                                    const cleanModel = (effectiveModel || "").toLowerCase().replace(/[\s\-_]/g, "");

                                    // Extract price from catalog if not in document
                                    const catalogMatch = products.find((p) => {
                                        if (!cleanModel) return false;
                                        const pCode = p.productCode.toLowerCase().replace(/[\s\-_]/g, "");
                                        const matchesCode = pCode === cleanModel || pCode.includes(cleanModel) || cleanModel.includes(pCode);
                                        const matchesBrand = !effectiveBrand || p.brand.toLowerCase() === effectiveBrand.toLowerCase();
                                        return matchesCode && matchesBrand && (p.netCost > 0 || p.listPrice > 0);
                                    });

                                    const isFromCatalog = (!item.unitPrice || item.unitPrice === 0) && !!catalogMatch;
                                    const unitPrice = (item.unitPrice && item.unitPrice > 0)
                                        ? item.unitPrice
                                        : (catalogMatch ? (catalogMatch.netCost || catalogMatch.listPrice) : 0);
                                    const totalPrice = (item.totalPrice && item.totalPrice > 0)
                                        ? item.totalPrice
                                        : (unitPrice > 0 ? unitPrice * (item.qty || 1) : 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-muted-bg/50 transition-colors">
                                            <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted shadow-[1px_0_0_0_var(--border)]">
                                                {item.lineNo}
                                            </td>

                                            {/* Category */}
                                            <td>
                                                {effectiveCat ? (
                                                    <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                                                        {effectiveCat}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                                                )}
                                            </td>

                                            {/* Description */}
                                            <td style={{ fontSize: "13px", fontWeight: 500, minWidth: "220px", maxWidth: "340px" }}>
                                                <div>{item.description}</div>
                                            </td>

                                            {/* Brand / Model */}
                                            <td>
                                                {effectiveModel || effectiveBrand ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                        {effectiveBrand && (
                                                            <span className="badge badge-blue" style={{ fontSize: "11px", alignSelf: "flex-start" }}>
                                                                {effectiveBrand}
                                                            </span>
                                                        )}
                                                        {effectiveModel && (
                                                            <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--foreground)" }}>
                                                                {effectiveModel}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                                                )}
                                            </td>

                                            {/* Specs: Rating, Poles, kA, Voltage, Power */}
                                            <td>
                                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                                    {spec.currentRating && (
                                                        <span className="badge badge-green" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                                            {spec.currentRating}
                                                        </span>
                                                    )}
                                                    {spec.poles && (
                                                        <span className="badge badge-blue" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                                            {spec.poles}
                                                        </span>
                                                    )}
                                                    {spec.breakingCapacity && (
                                                        <span className="badge badge-yellow" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                                            {spec.breakingCapacity}
                                                        </span>
                                                    )}
                                                    {spec.voltage && (
                                                        <span className="badge badge-purple" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                                            {spec.voltage}
                                                        </span>
                                                    )}
                                                    {spec.powerRating && (
                                                        <span className="badge badge-yellow" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                                            {spec.powerRating}
                                                        </span>
                                                    )}
                                                    {!spec.currentRating && !spec.poles && !spec.breakingCapacity && !spec.voltage && !spec.powerRating && (
                                                        <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Quantity */}
                                            <td style={{ textAlign: "center", fontWeight: 700, fontSize: "13px" }}>
                                                {item.qty} <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 400 }}>{item.unit || "Pcs"}</span>
                                            </td>

                                            {/* Mentioned or Extracted Unit Price */}
                                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                {unitPrice > 0 ? (
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                                        <span style={{ fontWeight: 700, color: "var(--success)", fontSize: "13px" }}>
                                                            {formatCurrency(unitPrice, currency)}
                                                        </span>
                                                        {isFromCatalog && (
                                                            <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 600 }}>
                                                                ⚡ Model Price
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                                )}
                                            </td>

                                            {/* Total Price */}
                                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                {totalPrice > 0 ? (
                                                    <span style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "13px" }}>
                                                        {formatCurrency(totalPrice, currency)}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                                )}
                                            </td>

                                            {/* Action Buttons */}
                                            <td>
                                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                    <button
                                                        type="button"
                                                        className="btn-primary btn-sm"
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => onOpenWizard(origIndex >= 0 ? origIndex : idx)}
                                                        title="Match this item in guided wizard"
                                                    >
                                                        ⚡ Match
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary btn-sm"
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => onAddDirectToCosting(item)}
                                                        title="Directly add this item with specified model & price into costing"
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

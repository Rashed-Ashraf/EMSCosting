"use client";

import { useState, useMemo } from "react";
import type { Product } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface ExtractedPriceListCatalogProps {
    products: Product[];
    activeBrands: string[];
    onAddToCosting?: (product: Product) => void;
    onClearAll?: () => void;
    onDeleteProduct?: (id: string) => void;
    onDeleteByBrand?: (brand: string) => void;
}

export default function ExtractedPriceListCatalog({
    products,
    activeBrands,
    onAddToCosting,
    onClearAll,
    onDeleteProduct,
    onDeleteByBrand,
}: ExtractedPriceListCatalogProps) {
    const [search, setSearch] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Unique categories across loaded products
    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const p of products) {
            if (p.category) set.add(p.category);
        }
        return Array.from(set).sort();
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        const s = search.trim().toLowerCase();
        return products.filter((p) => {
            if (selectedBrand !== "all" && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
                return false;
            }
            if (selectedCategory !== "all" && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
                return false;
            }
            if (!s) return true;
            return (
                p.productCode.toLowerCase().includes(s) ||
                p.description.toLowerCase().includes(s) ||
                p.brand.toLowerCase().includes(s) ||
                (p.category && p.category.toLowerCase().includes(s))
            );
        });
    }, [products, search, selectedBrand, selectedCategory]);

    // Catalog total valuation
    const totalCatalogValue = useMemo(() => {
        return products.reduce((sum, p) => sum + (p.netCost || 0), 0);
    }, [products]);

    const handleCopy = (code: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        }
    };

    if (products.length === 0) {
        return null;
    }

    return (
        <div className="card space-y-4 border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-card shadow-sm">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">📚</span>
                        <h2 className="text-base font-bold text-foreground">
                            Extracted Price Lists & Product Catalog
                        </h2>
                        <span className="badge badge-green text-xs font-semibold">
                            {products.length.toLocaleString()} Products Indexed
                        </span>
                        <span className="badge badge-purple text-xs">
                            Currency: PKR (₨)
                        </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                        All products extracted from your uploaded brand price lists. Search by code, filter by brand, or inspect pricing.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {selectedBrand !== "all" && onDeleteByBrand && (
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                            onClick={() => {
                                if (typeof window !== "undefined" && window.confirm(`Are you sure you want to delete all ${filteredProducts.length.toLocaleString()} indexed products for brand "${selectedBrand}"?`)) {
                                    onDeleteByBrand(selectedBrand);
                                }
                            }}
                        >
                            <span>🗑️</span> Delete {selectedBrand} ({filteredProducts.length.toLocaleString()})
                        </button>
                    )}
                    {onClearAll && (
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                            onClick={() => {
                                if (typeof window !== "undefined" && window.confirm(`Are you sure you want to delete ALL ${products.length.toLocaleString()} indexed products from the catalog?\n\nThis will completely wipe all previously indexed product records.`)) {
                                    onClearAll();
                                }
                            }}
                        >
                            <span>🗑️</span>
                            <span>Delete All ({products.length.toLocaleString()})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted-bg/60 border border-border">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Products</div>
                    <div className="text-lg font-extrabold text-foreground mt-0.5">
                        {products.length.toLocaleString()} Items
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-muted-bg/60 border border-border">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Catalog Brands</div>
                    <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                        {activeBrands.length} Brands
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-muted-bg/60 border border-border">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Filtered Results</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {filteredProducts.length.toLocaleString()} Showing
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-muted-bg/60 border border-border">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Catalog Value (PKR)</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(totalCatalogValue, "PKR")}
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[220px] relative">
                    <label htmlFor="catalog-search-input" className="sr-only">Search catalog</label>
                    <input
                        id="catalog-search-input"
                        className="input pl-8 text-xs h-9"
                        placeholder="Search product code, brand, description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
                        🔍
                    </span>
                </div>

                <label htmlFor="catalog-brand-filter" className="sr-only">Filter by brand</label>
                <select
                    id="catalog-brand-filter"
                    className="select text-xs h-9 min-w-[140px] w-auto"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                >
                    <option value="all">All Brands ({activeBrands.length})</option>
                    {activeBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>

                {categories.length > 0 && (
                    <>
                        <label htmlFor="catalog-category-filter" className="sr-only">Filter by category</label>
                        <select
                            id="catalog-category-filter"
                            className="select text-xs h-9 min-w-[140px] w-auto"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories ({categories.length})</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </>
                )}

                {(search || selectedBrand !== "all" || selectedCategory !== "all") && (
                    <button
                        type="button"
                        className="btn-ghost btn-sm text-xs"
                        onClick={() => {
                            setSearch("");
                            setSelectedBrand("all");
                            setSelectedCategory("all");
                        }}
                    >
                        ✕ Reset
                    </button>
                )}
            </div>

            {/* Products Table */}
            <div className="table-container max-h-[420px] overflow-y-auto">
                <table>
                    <thead className="sticky top-0 bg-muted-bg z-10">
                        <tr>
                            <th className="sticky left-0 z-20 bg-muted-bg text-center w-10">#</th>
                            <th>Product Code</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th className="text-right">List Price (PKR)</th>
                            <th className="text-center">Disc %</th>
                            <th className="text-right">Net Cost (PKR)</th>
                            <th className="text-center">Unit</th>
                            <th className="text-center w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.slice(0, 100).map((prod, idx) => {
                            return (
                                <tr key={prod.id || `${prod.productCode}-${idx}`} className="hover:bg-muted-bg/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted">
                                        {idx + 1}
                                    </td>
                                    <td className="font-bold text-xs whitespace-nowrap font-mono text-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <span>{prod.productCode}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(prod.productCode)}
                                                title="Copy code"
                                                className="text-[11px] p-0.5 opacity-70 hover:opacity-100"
                                            >
                                                {copiedCode === prod.productCode ? "✅" : "📋"}
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-blue text-[11px]">
                                            {prod.brand}
                                        </span>
                                    </td>
                                    <td>
                                        {prod.category ? (
                                            <span className="badge badge-purple text-[11px]">
                                                {prod.category}
                                            </span>
                                        ) : (
                                            <span className="text-muted text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="text-xs max-w-xs truncate">
                                        {prod.description}
                                    </td>
                                    <td className="text-right text-xs text-muted whitespace-nowrap">
                                        {formatCurrency(prod.listPrice, "PKR")}
                                    </td>
                                    <td className="text-center text-xs">
                                        {formatPercent(prod.discount)}
                                    </td>
                                    <td className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                                        {formatCurrency(prod.netCost, "PKR")}
                                    </td>
                                    <td className="text-center text-xs text-muted">
                                        {prod.unit || "Pcs"}
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {onAddToCosting ? (
                                                <button
                                                    type="button"
                                                    className="btn-primary btn-sm text-[11px] py-1 px-2.5"
                                                    onClick={() => onAddToCosting(prod)}
                                                >
                                                    + Add
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-secondary btn-sm text-[11px] py-1 px-2.5"
                                                    onClick={() => handleCopy(prod.productCode)}
                                                >
                                                    {copiedCode === prod.productCode ? "Copied" : "Copy"}
                                                </button>
                                            )}
                                            {onDeleteProduct && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (typeof window !== "undefined" && window.confirm(`Delete product "${prod.productCode}" (${prod.brand}) from index?`)) {
                                                            onDeleteProduct(prod.id);
                                                        }
                                                    }}
                                                    title={`Delete ${prod.productCode} from index`}
                                                    className="p-1 text-xs opacity-60 hover:opacity-100 hover:text-red-600 transition-opacity"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredProducts.length > 100 && (
                <div className="text-center text-xs text-muted pt-1">
                    Showing first 100 of {filteredProducts.length.toLocaleString()} matching products. Use search above to narrow down.
                </div>
            )}
        </div>
    );
}

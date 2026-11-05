"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import type { Product } from "@/lib/types";

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

    // Extract unique categories
    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const p of products) {
            if (p.category) set.add(p.category);
        }
        return Array.from(set).sort();
    }, [products]);

    // Financial totals
    const totalCatalogValue = useMemo(() => {
        return products.reduce((sum, p) => sum + (p.netCost || p.listPrice || 0), 0);
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (selectedBrand !== "all" && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
                return false;
            }
            if (selectedCategory !== "all" && (p.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
                return false;
            }
            if (search.trim()) {
                const q = search.toLowerCase();
                const text = `${p.productCode} ${p.brand} ${p.description || ""} ${p.category || ""}`.toLowerCase();
                if (!text.includes(q)) return false;
            }
            return true;
        });
    }, [products, selectedBrand, selectedCategory, search]);

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
        <div
            className="card"
            style={{
                marginTop: "28px",
                border: "1.5px solid rgba(59, 130, 246, 0.35)",
                background: "linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, var(--card) 100%)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                padding: "20px 24px",
            }}
        >
            {/* Section Header */}
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
                        <span style={{ fontSize: "22px" }}>📚</span>
                        <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                            Extracted Price Lists & Product Catalog
                        </h2>
                        <span className="badge badge-green" style={{ fontSize: "12px", fontWeight: 600 }}>
                            {products.length.toLocaleString()} Products Indexed
                        </span>
                        <span className="badge badge-purple" style={{ fontSize: "12px" }}>
                            Currency: PKR (₨)
                        </span>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px", marginBottom: 0 }}>
                        All products extracted from your uploaded brand price lists. Search by code, filter by brand, or inspect pricing.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {selectedBrand !== "all" && onDeleteByBrand && (
                        <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => {
                                if (typeof window !== "undefined" && window.confirm(`Are you sure you want to delete all ${filteredProducts.length.toLocaleString()} indexed products for brand "${selectedBrand}"?`)) {
                                    onDeleteByBrand(selectedBrand);
                                }
                            }}
                            style={{
                                fontSize: "12px",
                                color: "var(--danger)",
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                background: "rgba(239, 68, 68, 0.08)",
                                cursor: "pointer",
                            }}
                        >
                            🗑️ Delete {selectedBrand} ({filteredProducts.length.toLocaleString()})
                        </button>
                    )}
                    {onClearAll && (
                        <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => {
                                if (typeof window !== "undefined" && window.confirm(`Are you sure you want to delete ALL ${products.length.toLocaleString()} indexed products from the catalog?\n\nThis will completely wipe all previously indexed product records.`)) {
                                    onClearAll();
                                }
                            }}
                            style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#dc2626",
                                color: "#ffffff",
                                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
                                cursor: "pointer",
                                padding: "6px 14px",
                                borderRadius: "8px",
                            }}
                        >
                            <span>🗑️</span>
                            <span>Delete All Indexed Records ({products.length.toLocaleString()})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "18px",
                }}
            >
                <div style={{ background: "var(--muted-bg)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Products</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--foreground)", marginTop: "2px" }}>
                        {products.length.toLocaleString()} Items
                    </div>
                </div>

                <div style={{ background: "var(--muted-bg)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Catalog Brands</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent)", marginTop: "2px" }}>
                        {activeBrands.length} Brands
                    </div>
                </div>

                <div style={{ background: "var(--muted-bg)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Filtered Results</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--success)", marginTop: "2px" }}>
                        {filteredProducts.length.toLocaleString()} Showing
                    </div>
                </div>

                <div style={{ background: "var(--muted-bg)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Catalog Value (PKR)</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--success)", marginTop: "2px" }}>
                        {formatCurrency(totalCatalogValue, "PKR")}
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "14px",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
                    <input
                        className="input"
                        style={{ paddingLeft: "32px", height: "36px", fontSize: "13px" }}
                        placeholder="Search product code, brand, description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                        🔍
                    </span>
                </div>

                <select
                    className="select"
                    style={{ height: "36px", fontSize: "12px", minWidth: "140px" }}
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                >
                    <option value="all">All Brands ({activeBrands.length})</option>
                    {activeBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>

                {categories.length > 0 && (
                    <select
                        className="select"
                        style={{ height: "36px", fontSize: "12px", minWidth: "140px" }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">All Categories ({categories.length})</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                )}

                {(search || selectedBrand !== "all" || selectedCategory !== "all") && (
                    <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => {
                            setSearch("");
                            setSelectedBrand("all");
                            setSelectedCategory("all");
                        }}
                        style={{ fontSize: "12px" }}
                    >
                        ✕ Reset
                    </button>
                )}
            </div>

            {/* Products Table */}
            <div className="table-container" style={{ maxHeight: "420px", overflowY: "auto" }}>
                <table>
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 bg-muted-bg text-center w-10 shadow-[1px_0_0_0_var(--border)]">#</th>
                            <th>Product Code</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th style={{ textAlign: "right" }}>List Price (PKR)</th>
                            <th style={{ textAlign: "center" }}>Disc %</th>
                            <th style={{ textAlign: "right" }}>Net Cost (PKR)</th>
                            <th style={{ textAlign: "center" }}>Unit</th>
                            <th style={{ textAlign: "center", width: "100px" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.slice(0, 100).map((prod, idx) => {
                            return (
                                <tr key={prod.id || `${prod.productCode}-${idx}`} className="hover:bg-muted-bg/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card-bg text-center text-xs font-semibold text-muted shadow-[1px_0_0_0_var(--border)]">
                                        {idx + 1}
                                    </td>
                                    <td style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span>{prod.productCode}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(prod.productCode)}
                                                title="Copy code"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: "11px",
                                                    padding: "2px",
                                                    opacity: 0.7,
                                                }}
                                            >
                                                {copiedCode === prod.productCode ? "✅" : "📋"}
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-blue" style={{ fontSize: "11px" }}>
                                            {prod.brand}
                                        </span>
                                    </td>
                                    <td>
                                        {prod.category ? (
                                            <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                                                {prod.category}
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: "12px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {prod.description}
                                    </td>
                                    <td style={{ textAlign: "right", fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                                        {formatCurrency(prod.listPrice, "PKR")}
                                    </td>
                                    <td style={{ textAlign: "center", fontSize: "12px" }}>
                                        {formatPercent(prod.discount)}
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)", fontSize: "13px", whiteSpace: "nowrap" }}>
                                        {formatCurrency(prod.netCost, "PKR")}
                                    </td>
                                    <td style={{ textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
                                        {prod.unit || "Pcs"}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                            {onAddToCosting ? (
                                                <button
                                                    type="button"
                                                    className="btn-primary btn-sm"
                                                    style={{ padding: "3px 8px", fontSize: "11px" }}
                                                    onClick={() => onAddToCosting(prod)}
                                                >
                                                    + Add
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-secondary btn-sm"
                                                    style={{ padding: "3px 8px", fontSize: "11px" }}
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
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        padding: "3px",
                                                        opacity: 0.65,
                                                    }}
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
                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "var(--muted)" }}>
                    Showing first 100 of {filteredProducts.length.toLocaleString()} matching products. Use search above to narrow down.
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useCallback } from "react";
import { useEmsStore, DEFAULT_BRANDS } from "@/stores/appStore";
import { nanoid, formatDate, formatFileSize } from "@/lib/utils";
import type { PriceListMeta, ColumnMapping, ImportPreview } from "@/lib/types";
import ExtractedPriceListCatalog from "@/components/price-lists/ExtractedPriceListCatalog";

export default function PriceListsPage() {
    const {
        brands,
        addBrand,
        removeBrand,
        priceLists,
        addPriceList,
        updatePriceList,
        removePriceList,
        addProducts,
        removeProduct,
        removeProductsByBrand,
        clearProducts,
        products,
        addItemToCosting,
    } = useEmsStore();

    const [preview, setPreview] = useState<(ImportPreview & { brand: string; currency: string }) | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number; skipped: number } | null>(null);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [aiMapping, setAiMapping] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Active list of brands (persisted in Zustand store)
    const activeBrands = Array.from(
        new Set([
            ...(brands && brands.length > 0 ? brands : DEFAULT_BRANDS),
            ...priceLists.map((pl) => pl.brand).filter(Boolean),
        ])
    );

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const handleAddBrand = (brandName: string): boolean => {
        const trimmed = brandName.trim();
        if (!trimmed) return false;
        const added = addBrand(trimmed);
        if (!added) {
            showToast(`⚠️ Brand "${trimmed}" already exists`);
            return false;
        }
        showToast(`✅ Brand "${trimmed}" added`);
        return true;
    };

    const handleDeleteBrand = (brandToDelete: string) => {
        const associatedLists = priceLists.filter(
            (pl) => pl.brand.toLowerCase() === brandToDelete.toLowerCase()
        );
        const count = associatedLists.reduce((sum, pl) => sum + pl.productCount, 0);

        const message = count > 0
            ? `Are you sure you want to delete brand "${brandToDelete}"?\n\nThis will remove ${associatedLists.length} price list(s) and ${count} indexed products associated with this brand.`
            : `Are you sure you want to delete brand "${brandToDelete}"?`;

        if (typeof window !== "undefined" && window.confirm(message)) {
            removeBrand(brandToDelete);
            showToast(`🗑️ Brand "${brandToDelete}" removed`);
        }
    };

    const handleFileUpload = async (brand: string, file: File) => {
        addBrand(brand);
        const id = nanoid();
        const meta: PriceListMeta = {
            id, brand, fileName: file.name, currency: "PKR",
            uploadDate: formatDate(), status: "processing", productCount: 0,
        };
        addPriceList(meta);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("brand", brand);

        try {
            const res = await fetch("/api/price-lists/process", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                updatePriceList(id, { status: "error", errorMessage: data.error });
                showToast(`❌ ${data.error}`);
                return;
            }
            if (data.products && data.products.length > 0) {
                addProducts(data.products);
                updatePriceList(id, {
                    status: "ready",
                    productCount: data.products.length,
                });
                showToast(`✅ ${data.products.length} products automatically indexed for ${brand}`);
            } else {
                updatePriceList(id, {
                    status: "ready",
                    productCount: data.totalRows || 0,
                });
            }
            setPreview({ ...data, priceListId: id, brand });
            setMappings(data.mappings);
            setImportResult(null);
        } catch {
            updatePriceList(id, { status: "error", errorMessage: "Network error" });
            showToast("❌ Failed to upload file");
        }
    };

    const handleAiMap = async () => {
        if (!preview) return;
        setAiMapping(true);
        try {
            const res = await fetch("/api/ai/map-columns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ columnHeaders: preview.headers }),
            });
            const data = await res.json();
            if (res.ok && data.mappings) {
                setMappings(data.mappings);
                showToast("✅ AI column mapping complete");
            } else {
                showToast(`⚠️ ${data.error || "AI mapping failed"}`);
            }
        } catch {
            showToast("⚠️ AI mapping unavailable — map manually");
        } finally {
            setAiMapping(false);
        }
    };

    const handleConfirm = async () => {
        if (!preview) return;
        setImporting(true);
        try {
            const res = await fetch("/api/price-lists/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rows: preview.previewRows,
                    mappings,
                    brand: preview.brand,
                    priceListId: preview.priceListId,
                    currency: preview.currency || "PKR",
                }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(`❌ ${data.error}`); return; }

            addProducts(data.products);
            updatePriceList(preview.priceListId, { productCount: data.processedCount, status: "ready" });
            setImportResult({ count: data.processedCount, skipped: data.skippedCount });
            setPreview(null);
            showToast(`✅ ${data.processedCount} products imported`);
        } catch {
            showToast("❌ Import failed");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ padding: "28px 32px" }}>
            {toast && (
                <div className="toast" style={{ borderLeft: `3px solid ${toast.startsWith("✅") ? "var(--success)" : toast.startsWith("⚠") ? "var(--warning)" : "var(--danger)"}` }}>
                    {toast}
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>📋 Price Lists</h1>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                        Upload brand price lists in Excel (.xlsx, .xls), CSV, PDF (.pdf), or Image (.png, .jpg, .webp) formats to build the product index
                    </p>
                </div>
            </div>

            {/* Upload Cards */}
            <div className="grid-3" style={{ marginBottom: "28px" }}>
                {activeBrands.map((brand) => {
                    const loaded = priceLists.filter((pl) => pl.brand.toLowerCase() === brand.toLowerCase());
                    return (
                        <BrandCard
                            key={brand}
                            brand={brand}
                            priceLists={loaded}
                            onUpload={(file) => handleFileUpload(brand, file)}
                            onRemove={(id) => removePriceList(id)}
                            onDeleteBrand={() => handleDeleteBrand(brand)}
                        />
                    );
                })}
                {/* Custom Brand */}
                <CustomBrandCard
                    onAddBrand={handleAddBrand}
                    onUpload={handleFileUpload}
                />
            </div>

            {/* Import Preview */}
            {preview && (
                <div className="card" style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <h2 className="section-title" style={{ fontSize: "16px", margin: 0 }}>📊 Import Preview</h2>
                                {preview.fileType === "pdf" && <span className="badge badge-purple">📄 PDF Document</span>}
                                {preview.fileType === "image" && <span className="badge badge-blue">🖼️ Image Document</span>}
                                {preview.fileType === "spreadsheet" && <span className="badge badge-green">📊 Spreadsheet</span>}
                                {(preview as { extractionMethod?: string }).extractionMethod && (
                                    <span className="badge badge-gray">⚡ {(preview as { extractionMethod?: string }).extractionMethod}</span>
                                )}
                            </div>
                            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>
                                {preview.totalRows} product rows detected from <strong>{preview.fileName}</strong> · {preview.selectedSheet} · Review and confirm column mappings
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={handleAiMap} className="btn-secondary btn-sm" disabled={aiMapping}>
                                {aiMapping ? <><span className="spinner" style={{ width: 14, height: 14 }} />Mapping…</> : "🤖 AI Map Columns"}
                            </button>
                            <button onClick={() => setPreview(null)} className="btn-ghost btn-sm">Cancel</button>
                            <button onClick={handleConfirm} className="btn-primary btn-sm" disabled={importing}>
                                {importing ? "Importing…" : `✅ Confirm Import (${preview.totalRows} products)`}
                            </button>
                        </div>
                    </div>

                    {/* Sheet Selector */}
                    {preview.sheets.length > 1 && (
                        <div style={{ marginBottom: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <span className="label" style={{ marginBottom: 0 }}>Sheet:</span>
                            {preview.sheets.map((s) => (
                                <button
                                    key={s}
                                    className={s === preview.selectedSheet ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                                    onClick={() => setPreview({ ...preview, selectedSheet: s })}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Column Mapping */}
                    <ColumnMapper mappings={mappings} onChange={setMappings} />

                    {/* Data Preview */}
                    <div style={{ marginTop: "16px" }}>
                        <div className="label" style={{ marginBottom: "8px" }}>Data Preview (first {preview.previewRows.length} rows)</div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        {preview.headers.map((h) => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.previewRows.slice(0, 8).map((row, i) => (
                                        <tr key={i}>
                                            {preview.headers.map((h) => <td key={h} style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {importResult && (
                <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", padding: "14px 20px", fontSize: "14px", color: "#22c55e", marginBottom: "20px" }}>
                    ✅ <strong>{importResult.count.toLocaleString()}</strong> products imported successfully.
                    {importResult.skipped > 0 && ` ${importResult.skipped} rows were skipped.`}
                </div>
            )}

            {/* Extracted Products & Price List Catalog Section */}
            <ExtractedPriceListCatalog
                products={products}
                activeBrands={activeBrands}
                onAddToCosting={(product) => {
                    addItemToCosting(product);
                    showToast(`✅ Added ${product.productCode} to Costing`);
                }}
                onClearAll={() => {
                    clearProducts();
                    showToast("🗑️ All indexed products deleted");
                }}
                onDeleteProduct={(id) => {
                    removeProduct(id);
                    showToast("🗑️ Product removed from index");
                }}
                onDeleteByBrand={(brand) => {
                    removeProductsByBrand(brand);
                    showToast(`🗑️ All ${brand} products removed from index`);
                }}
            />
        </div>
    );
}

function BrandCard({
    brand,
    priceLists,
    onUpload,
    onRemove,
    onDeleteBrand,
}: {
    brand: string;
    priceLists: PriceListMeta[];
    onUpload: (file: File) => void;
    onRemove: (id: string) => void;
    onDeleteBrand: () => void;
}) {
    const hasActive = priceLists.some((pl) => pl.status === "ready");

    return (
        <div className="card" style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{brand}</div>
                        <button
                            type="button"
                            onClick={onDeleteBrand}
                            title={`Delete brand "${brand}"`}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                color: "var(--muted)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--danger)";
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--muted)";
                                e.currentTarget.style.background = "none";
                            }}
                        >
                            🗑️
                        </button>
                    </div>
                    {hasActive && <span className="badge badge-green" style={{ marginTop: "4px" }}>● Active</span>}
                </div>
                <span style={{ fontSize: "22px" }}>⚡</span>
            </div>

            {priceLists.map((pl) => {
                const isPdf = pl.fileName.toLowerCase().endsWith(".pdf");
                const isImg = /\.(png|jpe?g|webp|bmp)$/i.test(pl.fileName);
                const fileIcon = isPdf ? "📄 " : isImg ? "🖼️ " : "📊 ";

                return (
                    <div key={pl.id} style={{ background: "var(--muted-bg)", borderRadius: "8px", padding: "8px 10px", marginBottom: "8px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span title={pl.fileName} style={{ color: "var(--foreground)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
                                {fileIcon}{pl.fileName}
                            </span>
                            <span className={`badge ${pl.status === "ready" ? "badge-green" : pl.status === "error" ? "badge-red" : "badge-yellow"}`}>{pl.status}</span>
                        </div>
                        {pl.productCount > 0 ? (
                            <div style={{ color: "var(--success)", fontWeight: 600, marginTop: "4px", fontSize: "11px" }}>
                                ✅ {pl.productCount.toLocaleString()} products indexed · {pl.uploadDate}
                            </div>
                        ) : (
                            <div style={{ color: "var(--warning)", fontWeight: 600, marginTop: "4px", fontSize: "11px" }}>
                                ⚠️ 0 products indexed · Drop file again below to auto-index
                            </div>
                        )}
                        {pl.errorMessage && <div style={{ color: "var(--danger)", marginTop: "4px" }}>{pl.errorMessage}</div>}
                        <button onClick={() => onRemove(pl.id)} className="btn-danger btn-sm" style={{ marginTop: "6px", width: "100%", justifyContent: "center" }}>Remove File</button>
                    </div>
                );
            })}

            <FileDropzone onFile={onUpload} />
        </div>
    );
}

function CustomBrandCard({
    onAddBrand,
    onUpload,
}: {
    onAddBrand: (brand: string) => boolean;
    onUpload: (brand: string, file: File) => void;
}) {
    const [brand, setBrand] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = brand.trim();
        if (!trimmed) return;

        if (file) {
            onAddBrand(trimmed);
            onUpload(trimmed, file);
            setBrand("");
            setFile(null);
        } else {
            const added = onAddBrand(trimmed);
            if (added) {
                setBrand("");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ border: "1px dashed var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>✨</span> + Add Brand
            </div>
            <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="label">Brand Name</label>
                <input
                    className="input"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Eaton, Chint, Havells..."
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !file) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
            </div>
            <FileDropzone onFile={setFile} label={file ? `📄 ${file.name}` : "Attach price list (optional)"} />
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!brand.trim()}
                    style={{ width: "100%", justifyContent: "center" }}
                >
                    {file ? "🚀 Add Brand & Upload" : "+ Add Brand Card"}
                </button>
                {file && (
                    <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setFile(null)}
                        title="Remove attached file"
                    >
                        ✕
                    </button>
                )}
            </div>
        </form>
    );
}

const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg", "webp", "bmp"];

function FileDropzone({ onFile, label }: { onFile: (file: File) => void; label?: string }) {
    const [dragging, setDragging] = useState(false);

    const handleFile = (file: File | null) => {
        if (!file) return;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext || "")) {
            alert("Supported formats: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), and Images (.png, .jpg, .webp).");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert("File too large. Max 50MB.");
            return;
        }
        onFile(file);
    };

    return (
        <label
            className={`drop-zone ${dragging ? "active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            style={{ cursor: "pointer" }}
        >
            <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>📁</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                {label || "Drop price list or click to upload"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                Excel · CSV · PDF · Images (PNG, JPG, WEBP)
            </div>
        </label>
    );
}

const FIELD_OPTIONS = [
    { value: "product_code", label: "Product Code" },
    { value: "sku", label: "SKU" },
    { value: "brand", label: "Brand" },
    { value: "description", label: "Description" },
    { value: "list_price", label: "List Price" },
    { value: "discount", label: "Discount" },
    { value: "currency", label: "Currency" },
    { value: "category", label: "Category" },
    { value: "unit", label: "Unit" },
    { value: "ignore", label: "— Ignore —" },
];

function ColumnMapper({ mappings, onChange }: { mappings: ColumnMapping[]; onChange: (m: ColumnMapping[]) => void }) {
    return (
        <div>
            <div className="label" style={{ marginBottom: "8px" }}>Column Mappings</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {mappings.map((m, i) => (
                    <div key={i} style={{ background: "var(--muted-bg)", borderRadius: "8px", padding: "8px 10px", minWidth: "180px" }}>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>{m.originalHeader}</div>
                        <select
                            className="select"
                            value={m.mappedTo}
                            onChange={(e) => {
                                const updated = [...mappings];
                                updated[i] = { ...m, mappedTo: e.target.value as ColumnMapping["mappedTo"], aiSuggested: false };
                                onChange(updated);
                            }}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                            {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div style={{ marginTop: "4px", fontSize: "10px" }}>
                            <span className={`badge ${m.confidence >= 0.8 ? "badge-green" : m.confidence >= 0.5 ? "badge-yellow" : "badge-gray"}`}>
                                {m.aiSuggested ? "🤖 AI" : "Auto"} · {Math.round(m.confidence * 100)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

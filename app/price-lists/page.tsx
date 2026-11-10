"use client";

import { useState } from "react";
import { useEmsStore, DEFAULT_BRANDS } from "@/stores/appStore";
import { nanoid, formatDate } from "@/lib/utils";
import type { PriceListMeta, ColumnMapping, ImportPreview } from "@/lib/types";
import ExtractedPriceListCatalog from "@/components/price-lists/ExtractedPriceListCatalog";
import { ProcessingProgressCard, TableSkeleton, useProcessingProgress } from "@/components/common/ProcessingProgress";

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

    const [processingFile, setProcessingFile] = useState<{ isProcessing: boolean; fileName: string; brand: string }>({
        isProcessing: false,
        fileName: "",
        brand: "",
    });
    const { progress, stageIndex } = useProcessingProgress(processingFile.isProcessing, 12);

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
        setProcessingFile({ isProcessing: true, fileName: file.name, brand });

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
        } finally {
            setProcessingFile({ isProcessing: false, fileName: "", brand: "" });
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
                    priceListId: preview.priceListId,
                    brand: preview.brand,
                    currency: "PKR",
                    selectedSheet: preview.selectedSheet,
                    mappings,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(`❌ ${data.error}`);
                return;
            }

            addProducts(data.products);
            updatePriceList(preview.priceListId, {
                status: "ready",
                productCount: data.importedCount,
            });

            setImportResult({ count: data.importedCount, skipped: data.skippedCount });
            setPreview(null);
            showToast(`✅ ${data.importedCount} products indexed for ${preview.brand}`);
        } catch {
            showToast("❌ Import failed");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 w-full space-y-6">
            {toast && (
                <div className="toast border-l-4 border-emerald-500 shadow-md">
                    {toast}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>📋</span> Price Lists
                    </h1>
                    <p className="text-xs sm:text-sm text-muted mt-1">
                        Upload brand price lists in Excel (.xlsx, .xls), CSV, PDF (.pdf), or Image (.png, .jpg, .webp) formats to build the product index
                    </p>
                </div>
            </div>

            {/* Active AI / OCR Processing Progress */}
            {processingFile.isProcessing && (
                <div className="space-y-4">
                    <ProcessingProgressCard
                        title={`Scanning & Parsing Price List (${processingFile.brand})`}
                        fileName={processingFile.fileName}
                        progress={progress}
                        stageIndex={stageIndex}
                    />
                    <TableSkeleton rows={4} columns={7} />
                </div>
            )}

            {/* Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="card space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h2 className="text-base font-bold text-foreground">📊 Import Preview</h2>
                                {preview.fileType === "pdf" && <span className="badge badge-purple">📄 PDF Document</span>}
                                {preview.fileType === "image" && <span className="badge badge-blue">🖼️ Image Document</span>}
                                {preview.fileType === "spreadsheet" && <span className="badge badge-green">📊 Spreadsheet</span>}
                                {(preview as { extractionMethod?: string }).extractionMethod && (
                                    <span className="badge badge-gray">⚡ {(preview as { extractionMethod?: string }).extractionMethod}</span>
                                )}
                            </div>
                            <p className="text-xs text-muted">
                                {preview.totalRows} product rows detected from <strong className="text-foreground">{preview.fileName}</strong> · {preview.selectedSheet} · Review and confirm column mappings
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAiMap}
                                className="btn-secondary btn-sm"
                                disabled={aiMapping}
                            >
                                {aiMapping ? "🤖 Mapping…" : "🤖 AI Map Columns"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreview(null)}
                                className="btn-ghost btn-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="btn-primary btn-sm"
                                disabled={importing}
                            >
                                {importing ? "Importing…" : `✅ Confirm Import (${preview.totalRows} products)`}
                            </button>
                        </div>
                    </div>

                    {/* Sheet Selector */}
                    {preview.sheets.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="label mb-0">Sheet:</span>
                            {preview.sheets.map((s) => (
                                <button
                                    key={s}
                                    type="button"
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
                    <div className="space-y-2 pt-2 border-t border-border">
                        <div className="label mb-0">Data Preview (first {preview.previewRows.length} rows)</div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        {preview.headers.map((h, idx) => (
                                            <th
                                                key={h}
                                                className={idx === 0 ? "sticky left-0 z-20 bg-muted-bg" : ""}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.previewRows.slice(0, 8).map((row, i) => (
                                        <tr key={i} className="hover:bg-muted-bg/50 transition-colors">
                                            {preview.headers.map((h, idx) => (
                                                <td
                                                    key={h}
                                                    className={`${
                                                        idx === 0
                                                            ? "sticky left-0 z-10 bg-card-bg font-semibold text-foreground"
                                                            : "text-foreground/90"
                                                    } max-w-[200px] truncate`}
                                                >
                                                    {row[h]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {importResult && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm">
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
        <div className="card space-y-3 relative">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-base text-foreground">{brand}</div>
                        <button
                            type="button"
                            onClick={onDeleteBrand}
                            title={`Delete brand "${brand}"`}
                            className="p-1 text-xs text-muted hover:text-red-600 hover:bg-red-500/10 rounded transition-colors"
                        >
                            🗑️
                        </button>
                    </div>
                    {hasActive && <span className="badge badge-green mt-1">● Active</span>}
                </div>
                <span className="text-xl">⚡</span>
            </div>

            {priceLists.map((pl) => {
                const isPdf = pl.fileName.toLowerCase().endsWith(".pdf");
                const isImg = /\.(png|jpe?g|webp|bmp)$/i.test(pl.fileName);
                const fileIcon = isPdf ? "📄 " : isImg ? "🖼️ " : "📊 ";

                return (
                    <div key={pl.id} className="p-2.5 rounded-lg bg-muted-bg/60 border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between">
                            <span title={pl.fileName} className="font-medium text-foreground truncate max-w-[150px]">
                                {fileIcon}{pl.fileName}
                            </span>
                            <span className={`badge ${pl.status === "ready" ? "badge-green" : pl.status === "error" ? "badge-red" : "badge-yellow"}`}>
                                {pl.status}
                            </span>
                        </div>
                        {pl.productCount > 0 ? (
                            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                ✅ {pl.productCount.toLocaleString()} products indexed · {pl.uploadDate}
                            </div>
                        ) : (
                            <div className="text-[11px] font-semibold text-amber-500">
                                ⚠️ 0 products indexed · Drop file again below
                            </div>
                        )}
                        {pl.errorMessage && <div className="text-[11px] text-red-500">{pl.errorMessage}</div>}
                        <button
                            type="button"
                            onClick={() => onRemove(pl.id)}
                            className="w-full text-center py-1 rounded text-[11px] text-red-600 hover:bg-red-500/10 transition-colors font-medium"
                        >
                            Remove File
                        </button>
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
        <form onSubmit={handleSubmit} className="card border-dashed border-2 space-y-3">
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <span>✨</span> + Add Brand
            </div>
            <div className="space-y-1">
                <label htmlFor="custom-brand-name-input" className="label mb-0">Brand Name</label>
                <input
                    id="custom-brand-name-input"
                    className="input text-xs"
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
            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    className="btn-primary w-full justify-center text-xs"
                    disabled={!brand.trim()}
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
            className={`drop-zone group flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                dragging
                    ? "border-blue-600 bg-blue-600/10"
                    : "border-border hover:border-blue-500 bg-muted-bg/40 hover:bg-muted-bg/70"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        >
            <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📁</div>
            <div className="text-xs font-semibold text-foreground">
                {label || "Drop price list or click to upload"}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
                Excel · CSV · PDF · Images
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
        <div className="space-y-2">
            <div className="label mb-0">Column Mappings</div>
            <div className="flex flex-wrap gap-2">
                {mappings.map((m, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-muted-bg/60 border border-border min-w-[180px] space-y-1">
                        <label htmlFor={`map-col-${i}`} className="text-xs text-muted block truncate font-medium">
                            {m.originalHeader}
                        </label>
                        <select
                            id={`map-col-${i}`}
                            className="select text-xs py-1 px-2"
                            value={m.mappedTo}
                            onChange={(e) => {
                                const updated = [...mappings];
                                updated[i] = { ...m, mappedTo: e.target.value as ColumnMapping["mappedTo"], aiSuggested: false };
                                onChange(updated);
                            }}
                        >
                            {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div className="text-[10px]">
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

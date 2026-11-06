"use client";

import { useState, useEffect, useRef } from "react";
import { useEmsStore } from "@/stores/appStore";
import { searchProducts } from "@/lib/search/productSearch";
import { matchBlindQuotation, parseElectricalQuery } from "@/lib/search/blindQuotation";
import { formatCurrency } from "@/lib/calculations";
import { isValidBrandName } from "@/lib/utils";
import type { BOQItem, BOQMatch, Product, SearchResult } from "@/lib/types";
import RequirementPreviewSection from "@/components/costing/RequirementPreviewSection";
import { ProcessingProgressCard, CardSkeleton, useProcessingProgress } from "@/components/common/ProcessingProgress";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportBOQPage() {
    const router = useRouter();
    const { products, setBoqMatches, boqMatches, updateBoqMatch, clearBoqMatches, addItemToCosting } = useEmsStore();
    const [uploading, setUploading] = useState(false);
    const [rawBoqItems, setRawBoqItems] = useState<BOQItem[]>([]);
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [brandMode, setBrandMode] = useState<string>("strict");
    const [toast, setToast] = useState<string | null>(null);

    const { progress, stageIndex } = useProcessingProgress(uploading, 12);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    // Unique brands in currently indexed catalog
    const catalogBrands = Array.from(new Set(products.map((p) => p.brand))).filter(Boolean);

    // Unique brands detected in uploaded BOQ items
    const boqBrands = Array.from(
        new Set(rawBoqItems.map((i) => i.brand).filter((b): b is string => Boolean(b && isValidBrandName(b))))
    );

    const matchItems = (
        items: BOQItem[],
        catalogProducts: Product[],
        mode: string = "strict"
    ): BOQMatch[] => {
        return items.map((item) => {
            const spec = parseElectricalQuery(item.description);
            const boqBrand = (item.brand && isValidBrandName(item.brand)) ? item.brand : spec.brand;

            let targetBrand: string | undefined = undefined;
            if (mode === "strict") {
                targetBrand = boqBrand;
            } else if (mode !== "all") {
                targetBrand = mode;
            }

            // Filter catalog strictly to target brand if specified
            const candidatePool = targetBrand
                ? catalogProducts.filter((p) => p.brand.toLowerCase() === targetBrand.toLowerCase())
                : catalogProducts;

            // 1. Standard search within brand candidate pool
            const stdResults = searchProducts(item.description, candidatePool, 5, targetBrand);

            // 2. Blind Spec matching with brand constraint
            const blindResults = matchBlindQuotation(
                targetBrand ? { query: item.description, brand: targetBrand } : item.description,
                candidatePool,
                5
            );

            const topStd = stdResults[0];
            const topBlind = blindResults[0];

            let suggested: Product | null = null;
            let confidence = 0;
            let alts: Product[] = [];

            if (topBlind && topBlind.score >= 0.75 && (!topStd || topBlind.score > topStd.score)) {
                suggested = topBlind.product;
                confidence = topBlind.score;
                alts = blindResults.slice(1, 5).map((r) => r.product);
            } else if (topStd) {
                suggested = topStd.product;
                confidence = topStd.score;
                alts = stdResults.slice(1, 5).map((r) => r.product);
            } else if (topBlind) {
                suggested = topBlind.product;
                confidence = topBlind.score;
                alts = blindResults.slice(1, 5).map((r) => r.product);
            }

            return {
                boqItem: item,
                suggestedProduct: suggested,
                confidence,
                alternatives: alts,
                status: "pending" as const,
            };
        });
    };

    const handleBrandModeChange = (newMode: string) => {
        setBrandMode(newMode);
        if (rawBoqItems.length > 0) {
            const matches = matchItems(rawBoqItems, products, newMode);
            setBoqMatches(matches);
            showToast(`🔄 Re-matched with rule: ${newMode === "strict" ? "Strict BOQ Brands" : newMode === "all" ? "All Catalog Brands" : newMode}`);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploadedFileName(file.name);
        setUploading(true);
        clearBoqMatches();
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/api/boq/process", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) { showToast(`❌ ${data.error}`); return; }

            const items: BOQItem[] = data.items;
            setRawBoqItems(items);
            setUploadedFileName(file.name);
            const matches = matchItems(items, products, brandMode);
            setBoqMatches(matches);
            showToast(`✅ ${items.length} BOQ items loaded & matched with Blind Spec engine`);
        } catch {
            showToast("❌ Failed to process BOQ file");
        } finally {
            setUploading(false);
        }
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
            currency: item.currency || "PKR",
            priceListId: "requirement-file",
            category: item.category || spec.componentType || "Requirement Item",
            unit: item.unit || "Pcs",
        };

        for (let i = 0; i < (item.qty || 1); i++) {
            addItemToCosting(directProduct);
        }
        showToast(`✅ Added ${item.qty || 1}x direct requirement "${code}" to Costing`);
    };

    const handleAddAllDirectRequirements = (itemsToUse: BOQItem[] = rawBoqItems) => {
        itemsToUse.forEach((item) => {
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
                currency: item.currency || "PKR",
                priceListId: "requirement-file",
                category: item.category || spec.componentType || "Requirement Item",
                unit: item.unit || "Pcs",
            };

            for (let i = 0; i < (item.qty || 1); i++) {
                addItemToCosting(directProduct);
            }
        });
        showToast(`✅ Added all ${itemsToUse.length} items directly to Costing`);
    };

    const handleNewBoq = () => {
        setRawBoqItems([]);
        setUploadedFileName("");
        clearBoqMatches();
        showToast("Ready to upload new BOQ");
    };

    const handleDeleteBoqCalculation = () => {
        if (confirm("Are you sure you want to delete this BOQ calculation? All matched items will be cleared.")) {
            clearBoqMatches();
            setRawBoqItems([]);
            setUploadedFileName("");
            showToast("🗑️ BOQ calculation deleted");
        }
    };

    const handleAcceptAll = () => {
        boqMatches.forEach((m) => {
            if (m.confidence >= 0.8 && m.status === "pending") {
                updateBoqMatch(m.boqItem.id, { status: "accepted" });
            }
        });
        showToast("✅ Accepted all high-confidence matches");
    };

    const handleAddToCosting = () => {
        const accepted = boqMatches.filter((m) => m.status === "accepted" && m.suggestedProduct);
        accepted.forEach((m) => {
            if (m.suggestedProduct) {
                const productWithQty = { ...m.suggestedProduct };
                for (let i = 0; i < (m.boqItem.qty || 1); i++) {
                    addItemToCosting(productWithQty);
                }
            }
        });
        showToast(`✅ ${accepted.length} items added to costing`);
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
            {toast && (
                <div className="toast border-l-4 border-emerald-500 shadow-md">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>📥</span> Import BOQ
                    </h1>
                    <p className="text-xs sm:text-sm text-muted mt-1">
                        Upload a customer Bill of Quantities to automatically match products
                    </p>
                </div>
                {boqMatches.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={handleNewBoq}
                            title="Start a new BOQ upload"
                        >
                            <span>➕</span>
                            <span>New BOQ</span>
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                            onClick={handleDeleteBoqCalculation}
                            title="Delete this previous BOQ calculation"
                        >
                            <span>🗑️</span>
                            <span>Delete Calculation</span>
                        </button>

                        <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={handleAcceptAll}
                        >
                            ✅ Accept High-Confidence
                        </button>

                        <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={!boqMatches.some((m) => m.status === "accepted")}
                            onClick={handleAddToCosting}
                        >
                            🧮 Add Accepted to Costing
                        </button>
                    </div>
                )}
            </div>

            {products.length === 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ No products indexed.{" "}
                    <Link href="/price-lists" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Upload a price list first →
                    </Link>
                </div>
            )}

            {/* Extracted Document Preview Section */}
            {rawBoqItems.length > 0 && (
                <RequirementPreviewSection
                    items={rawBoqItems}
                    fileName={uploadedFileName}
                    currency="PKR"
                    products={products}
                    onOpenWizard={() => {
                        router.push("/costing");
                    }}
                    onClear={() => {
                        setRawBoqItems([]);
                        setUploadedFileName("");
                        clearBoqMatches();
                    }}
                    onAddDirectToCosting={handleAddDirectRequirement}
                    onAddAllToCosting={() => handleAddAllDirectRequirements(rawBoqItems)}
                />
            )}

            {/* Upload or Loading State */}
            {uploading ? (
                <div className="space-y-4">
                    <ProcessingProgressCard
                        title="Processing BOQ & Extracting Specifications"
                        fileName={uploadedFileName || "Uploaded Document"}
                        progress={progress}
                        stageIndex={stageIndex}
                    />
                    <CardSkeleton count={3} />
                </div>
            ) : (
                boqMatches.length === 0 && (
                    <div className="card">
                        <BOQDropzone onFile={handleFileUpload} />
                    </div>
                )
            )}

            {/* Stats & Match List */}
            {boqMatches.length > 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{boqMatches.length}</div>
                            <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">BOQ Items</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{boqMatches.filter((m) => m.confidence >= 0.8).length}</div>
                            <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">High Confidence</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-amber-500">{boqMatches.filter((m) => m.confidence >= 0.5 && m.confidence < 0.8).length}</div>
                            <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Medium Confidence</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-red-500">{boqMatches.filter((m) => m.confidence < 0.5 || !m.suggestedProduct).length}</div>
                            <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Low / No Match</div>
                        </div>
                    </div>

                    {/* Brand Matching Policy Bar */}
                    <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/5 via-card to-card border border-border">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xl">🎯</span>
                            <label htmlFor="boq-brand-mode-select" className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Brand Matching Rule:
                            </label>
                            <select
                                id="boq-brand-mode-select"
                                className="select text-xs py-1.5 px-3 min-w-[220px]"
                                value={brandMode}
                                onChange={(e) => handleBrandModeChange(e.target.value)}
                            >
                                <option value="strict">
                                    🎯 Strict BOQ Brands {boqBrands.length > 0 ? `(${boqBrands.join(", ")})` : ""}
                                </option>
                                <option value="all">
                                    🌐 Any Catalog Brand (Allow Substitutions)
                                </option>
                                {catalogBrands.map((b) => (
                                    <option key={b} value={b}>
                                        Force Catalog Brand: {b}
                                    </option>
                                ))}
                            </select>
                            <span className="text-xs text-muted">
                                {brandMode === "strict"
                                    ? "BOQ items with specific brands strictly match only catalog products from that brand."
                                    : "Matching against any indexed brand in the catalog."}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {boqBrands.length > 0 && (
                                <div className="flex items-center gap-1.5 mr-2">
                                    <span className="text-[11px] text-muted uppercase font-semibold">Detected:</span>
                                    {boqBrands.map((b) => (
                                        <span key={b} className="badge badge-blue text-[11px]">{b}</span>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={handleNewBoq}
                            >
                                <span>➕</span> New BOQ
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-red-600 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                onClick={handleDeleteBoqCalculation}
                            >
                                <span>🗑️</span> Delete BOQ
                            </button>
                        </div>
                    </div>

                    {/* Match List */}
                    <div className="space-y-3">
                        {boqMatches.map((match) => (
                            <BOQMatchCard
                                key={match.boqItem.id}
                                match={match}
                                products={products}
                                brandMode={brandMode}
                                onAccept={() => updateBoqMatch(match.boqItem.id, { status: "accepted" })}
                                onReject={() => updateBoqMatch(match.boqItem.id, { status: "rejected" })}
                                onSelectAlternative={(product) => updateBoqMatch(match.boqItem.id, { suggestedProduct: product, confidence: 0.9, status: "accepted" })}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pt-3 flex-wrap">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleNewBoq}
                        >
                            <span>➕</span>
                            <span>Upload New BOQ</span>
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                            onClick={handleDeleteBoqCalculation}
                        >
                            <span>🗑️</span>
                            <span>Delete Previous BOQ Calculation</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function BOQDropzone({ onFile }: { onFile: (f: File) => void }) {
    const [dragging, setDragging] = useState(false);

    return (
        <label
            className={`drop-zone group relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                dragging
                    ? "border-blue-600 bg-blue-600/10 scale-[1.005]"
                    : "border-border hover:border-blue-500 bg-muted-bg/30 hover:bg-muted-bg/60"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        >
            <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📥</div>
            <div className="text-base font-bold text-foreground mb-1">
                Drop your BOQ / Requirement file here
            </div>
            <div className="text-xs text-muted max-w-md">
                Excel (.xlsx, .xls), CSV, PDF (.pdf), or Images (PNG, JPG, WEBP) · Any format with Description + Qty
            </div>
            <div className="mt-4">
                <span className="btn-primary btn-sm pointer-events-none">
                    Browse File
                </span>
            </div>
        </label>
    );
}

function BOQMatchCard({ match, products, brandMode = "strict", onAccept, onReject, onSelectAlternative }: {
    match: BOQMatch;
    products: Product[];
    brandMode?: string;
    onAccept: () => void;
    onReject: () => void;
    onSelectAlternative: (p: Product) => void;
}) {
    const { boqItem, suggestedProduct, confidence, alternatives, status } = match;
    const [showAlts, setShowAlts] = useState(false);
    const [manualSearch, setManualSearch] = useState("");
    const [manualResults, setManualResults] = useState<SearchResult[]>([]);
    const timer = useRef<ReturnType<typeof setTimeout>>(null);

    // Parse specs from BOQ description
    const spec = parseElectricalQuery(boqItem.description);
    const validBrand = (boqItem.brand && isValidBrandName(boqItem.brand))
        ? boqItem.brand
        : (isValidBrandName(spec.brand) ? spec.brand : undefined);

    const specPills = [
        validBrand,
        spec.componentType,
        spec.currentRating,
        spec.poles,
        spec.breakingCapacity,
    ].filter(Boolean);

    useEffect(() => {
        if (!manualSearch) { setManualResults([]); return; }
        clearTimeout(timer.current!);
        timer.current = setTimeout(() => {
            const effectiveBrand = brandMode === "strict" ? validBrand : (brandMode === "all" ? undefined : brandMode);
            const pool = effectiveBrand
                ? products.filter((p) => p.brand.toLowerCase() === effectiveBrand.toLowerCase())
                : products;
            const std = searchProducts(manualSearch, pool, 8, effectiveBrand);
            const blind = matchBlindQuotation(
                effectiveBrand ? { query: manualSearch, brand: effectiveBrand } : manualSearch,
                pool,
                8
            );
            const seen = new Set<string>();
            const combined: SearchResult[] = [];
            for (const b of blind) {
                if (!seen.has(b.product.id)) {
                    seen.add(b.product.id);
                    combined.push({ product: b.product, score: b.score, matchType: b.score >= 0.8 ? "exact" : "fuzzy" });
                }
            }
            for (const s of std) {
                if (!seen.has(s.product.id)) {
                    seen.add(s.product.id);
                    combined.push(s);
                }
            }
            setManualResults(combined.slice(0, 10));
        }, 250);
    }, [manualSearch, products, brandMode, validBrand]);

    const confColor = confidence >= 0.8
        ? "text-emerald-600 dark:text-emerald-400"
        : confidence >= 0.5
        ? "text-amber-500"
        : "text-red-500";

    const confBg = confidence >= 0.8
        ? "bg-emerald-500"
        : confidence >= 0.5
        ? "bg-amber-500"
        : "bg-red-500";

    const statusBadge = status === "accepted" ? "badge-green" : status === "rejected" ? "badge-red" : "badge-gray";

    return (
        <div className={`card p-4 transition-all ${status === "rejected" ? "opacity-50" : "opacity-100"}`}>
            <div className="flex flex-col md:flex-row items-start gap-4">
                {/* BOQ Item */}
                <div className="w-full md:w-64 shrink-0 space-y-1">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">BOQ Item #{boqItem.lineNo}</div>
                    <div className="font-semibold text-sm text-foreground">{boqItem.description}</div>
                    <div className="text-xs text-muted">Qty: <strong className="text-foreground">{boqItem.qty}</strong></div>
                    {specPills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                            {specPills.map((pill, i) => (
                                <span key={i} className="text-[10px] bg-muted-bg border border-border px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-medium">
                                    ⚡ {pill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div className="hidden md:block text-muted text-xl pt-2">→</div>

                {/* Match */}
                <div className="flex-1 min-w-0">
                    {suggestedProduct ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="badge badge-blue">{suggestedProduct.brand}</span>
                                <span className="font-bold text-sm text-foreground font-mono">{suggestedProduct.productCode}</span>
                                <div className="w-20 bg-muted-bg rounded-full h-2 overflow-hidden border border-border/40 inline-flex">
                                    <div
                                        className={`h-full rounded-full transition-all ${confBg}`}
                                        style={{ width: `${Math.round(confidence * 100)}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-semibold ${confColor}`}>
                                    {Math.round(confidence * 100)}% match
                                </span>
                            </div>
                            <div className="text-xs text-muted">{suggestedProduct.description}</div>
                            <div className="flex items-center gap-2 text-xs">
                                {suggestedProduct.listPrice > 0 && (
                                    <span className="text-muted line-through">
                                        {formatCurrency(suggestedProduct.listPrice, "PKR")}
                                    </span>
                                )}
                                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(suggestedProduct.netCost, "PKR")}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-1 space-y-1">
                            <div className="text-xs text-muted italic">
                                No match found in product index {validBrand ? `for brand "${validBrand}"` : ""}
                            </div>
                            {validBrand && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <span>⚠️</span>
                                    <span>
                                        No {validBrand} price list has been indexed. Upload an {validBrand} price list in{" "}
                                        <Link href="/price-lists" className="text-blue-600 dark:text-blue-400 underline font-semibold">
                                            Price Lists
                                        </Link>{" "}
                                        to match this item.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span className={`badge ${statusBadge}`}>{status}</span>
                    {status === "pending" && suggestedProduct && confidence >= 0.5 && (
                        <button type="button" className="btn-success btn-sm" onClick={onAccept}>✓ Accept</button>
                    )}
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAlts(!showAlts)}>
                        {showAlts ? "Hide" : "Alternatives"}
                    </button>
                    {status !== "rejected" && (
                        <button type="button" className="btn-danger btn-sm" onClick={onReject}>✕</button>
                    )}
                </div>
            </div>

            {/* Alternatives / Manual Search */}
            {showAlts && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                        <label htmlFor={`alt-search-${boqItem.id}`} className="sr-only">Search Alternative</label>
                        <input
                            id={`alt-search-${boqItem.id}`}
                            className="input text-xs"
                            placeholder="Search for alternative catalog item..."
                            value={manualSearch}
                            onChange={(e) => setManualSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {(manualSearch ? manualResults : alternatives.map((p) => ({ product: p, score: 0.7, matchType: "fuzzy" as const }))).map((r) => (
                            <div key={r.product.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted-bg/60 hover:bg-muted-bg text-xs transition-colors">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="badge badge-blue">{r.product.brand}</span>
                                    <span className="font-semibold text-foreground font-mono">{r.product.productCode}</span>
                                    <span className="text-muted truncate">{r.product.description}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(r.product.netCost, "PKR")}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-primary btn-sm"
                                        onClick={() => { onSelectAlternative(r.product); setShowAlts(false); }}
                                    >
                                        Select
                                    </button>
                                </div>
                            </div>
                        ))}
                        {manualSearch && manualResults.length === 0 && (
                            <div className="text-xs text-muted p-2">No results for &ldquo;{manualSearch}&rdquo;</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

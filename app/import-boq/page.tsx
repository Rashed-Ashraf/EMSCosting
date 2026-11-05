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

        addItemToCosting(directProduct, {
            qty: item.qty || 1,
            customDescription: item.description,
        });
        showToast(`✅ Added #${item.lineNo} (${code}) to Costing`);
    };

    const handleNewBoq = () => {
        if (boqMatches.length > 0) {
            const confirmed = typeof window !== "undefined" && window.confirm(
                `Start a new BOQ?\n\nThis will clear the current ${boqMatches.length} calculated items and open the upload dropzone for your new BOQ.`
            );
            if (!confirmed) return;
        }
        clearBoqMatches();
        setRawBoqItems([]);
        setUploadedFileName("");
        showToast("📄 Ready for new BOQ upload");
    };

    const handleDeleteBoqCalculation = () => {
        const confirmed = typeof window !== "undefined" && window.confirm(
            `Are you sure you want to delete this previous BOQ calculation (${boqMatches.length} items)?\n\nThis will completely clear all current matches and reset the BOQ import session.`
        );
        if (!confirmed) return;

        clearBoqMatches();
        setRawBoqItems([]);
        setUploadedFileName("");
        showToast("🗑️ Previous BOQ calculation deleted");
    };

    const handleAddAllDirectRequirements = () => {
        if (rawBoqItems.length === 0) return;
        rawBoqItems.forEach((item) => {
            handleAddDirectRequirement(item);
        });
        showToast(`✅ Added all ${rawBoqItems.length} items to Costing`);
    };

    const handleAcceptAll = () => {
        boqMatches.forEach((m) => {
            if (m.suggestedProduct && m.confidence >= 0.6 && m.status === "pending") {
                updateBoqMatch(m.boqItem.id, { status: "accepted" });
            }
        });
        showToast("✅ High-confidence matches accepted");
    };

    const handleAddToCosting = () => {
        const accepted = boqMatches.filter((m) => m.status === "accepted" && m.suggestedProduct);
        accepted.forEach((m) => {
            if (m.suggestedProduct) {
                // We need to create a product with the BOQ qty
                const productWithQty = { ...m.suggestedProduct };
                addItemToCosting(productWithQty);
            }
        });
        showToast(`✅ ${accepted.length} items added to costing`);
    };

    return (
        <div style={{ padding: "28px 32px" }}>
            {toast && <div className="toast" style={{ borderLeft: "3px solid var(--success)" }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>📥 Import BOQ</h1>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                        Upload a customer Bill of Quantities to automatically match products
                    </p>
                </div>
                {boqMatches.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleNewBoq}
                            title="Start a new BOQ upload"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                            <span>➕</span>
                            <span>New BOQ</span>
                        </button>

                        <button
                            type="button"
                            className="btn-danger"
                            onClick={handleDeleteBoqCalculation}
                            title="Delete this previous BOQ calculation"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#dc2626",
                                color: "#ffffff",
                                borderColor: "#dc2626",
                            }}
                        >
                            <span>🗑️</span>
                            <span>Delete BOQ Calculation</span>
                        </button>

                        <button className="btn-secondary" onClick={handleAcceptAll}>
                            ✅ Accept High-Confidence
                        </button>

                        <button
                            className="btn-primary"
                            disabled={!boqMatches.some((m) => m.status === "accepted")}
                            onClick={handleAddToCosting}
                        >
                            🧮 Add Accepted to Costing
                        </button>
                    </div>
                )}
            </div>

            {products.length === 0 && (
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "var(--warning)" }}>
                    ⚠️ No products indexed. <a href="/price-lists" style={{ color: "var(--accent)" }}>Upload a price list first →</a>
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
                    onAddAllToCosting={handleAddAllDirectRequirements}
                />
            )}

            {/* Upload or Loading State */}
            {uploading ? (
                <div className="space-y-4 mb-6">
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
                    <div className="card mb-5">
                        <BOQDropzone onFile={handleFileUpload} />
                    </div>
                )
            )}

            {/* Stats */}
            {boqMatches.length > 0 && (
                <>
                    <div className="grid-4" style={{ marginBottom: "20px" }}>
                        <div className="stat-card">
                            <div className="stat-value">{boqMatches.length}</div>
                            <div className="stat-label">BOQ Items</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: "var(--success)" }}>{boqMatches.filter((m) => m.confidence >= 0.8).length}</div>
                            <div className="stat-label">High Confidence</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: "var(--warning)" }}>{boqMatches.filter((m) => m.confidence >= 0.5 && m.confidence < 0.8).length}</div>
                            <div className="stat-label">Medium Confidence</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: "var(--danger)" }}>{boqMatches.filter((m) => m.confidence < 0.5 || !m.suggestedProduct).length}</div>
                            <div className="stat-label">Low / No Match</div>
                        </div>
                    </div>

                    {/* Brand Matching Policy Bar */}
                    <div
                        className="card"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "16px",
                            padding: "12px 18px",
                            background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, var(--card) 100%)",
                            border: "1px solid var(--border)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "16px" }}>🎯</span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                                Brand Matching Rule:
                            </span>
                            <select
                                className="select"
                                value={brandMode}
                                onChange={(e) => handleBrandModeChange(e.target.value)}
                                style={{ height: "34px", fontSize: "12px", minWidth: "250px" }}
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
                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                {brandMode === "strict"
                                    ? "BOQ items with an ABB / specific brand will strictly match only catalog products from that brand."
                                    : "Matching against any indexed brand in the catalog."}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {boqBrands.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "6px" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Detected BOQ Brands:</span>
                                    {boqBrands.map((b) => (
                                        <span key={b} className="badge badge-blue" style={{ fontSize: "11px" }}>{b}</span>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={handleNewBoq}
                                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                                <span>➕</span> New BOQ
                            </button>
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={handleDeleteBoqCalculation}
                                style={{
                                    fontSize: "12px",
                                    color: "var(--danger)",
                                    borderColor: "rgba(239, 68, 68, 0.4)",
                                    background: "rgba(239, 68, 68, 0.08)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                <span>🗑️</span> Delete BOQ
                            </button>
                        </div>
                    </div>

                    {/* Match List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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

                    <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleNewBoq}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                            <span>➕</span>
                            <span>Upload New BOQ</span>
                        </button>
                        <button
                            type="button"
                            className="btn-danger"
                            onClick={handleDeleteBoqCalculation}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#dc2626",
                                color: "#ffffff",
                                borderColor: "#dc2626",
                            }}
                        >
                            <span>🗑️</span>
                            <span>Delete Previous BOQ Calculation</span>
                        </button>
                    </div>
                </>
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
                    ? "border-accent bg-accent/10 scale-[1.005]"
                    : "border-border hover:border-accent/80 bg-muted-bg/30 hover:bg-muted-bg/60"
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

    const confColor = confidence >= 0.8 ? "var(--success)" : confidence >= 0.5 ? "var(--warning)" : "var(--danger)";
    const statusColor = status === "accepted" ? "badge-green" : status === "rejected" ? "badge-red" : "badge-gray";

    return (
        <div className="card" style={{ padding: "14px 18px", opacity: status === "rejected" ? 0.5 : 1 }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {/* BOQ Item */}
                <div style={{ minWidth: "220px", flex: "0 0 220px" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>BOQ Item #{boqItem.lineNo}</div>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>{boqItem.description}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>Qty: {boqItem.qty}</div>
                    {specPills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {specPills.map((pill, i) => (
                                <span key={i} style={{ fontSize: "10px", background: "var(--muted-bg)", border: "1px solid var(--border)", padding: "1px 5px", borderRadius: "3px", color: "var(--accent)" }}>
                                    ⚡ {pill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div style={{ color: "var(--muted)", fontSize: "20px", paddingTop: "10px" }}>→</div>

                {/* Match */}
                <div style={{ flex: 1 }}>
                    {suggestedProduct ? (
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span className="badge badge-blue">{suggestedProduct.brand}</span>
                                    <span style={{ fontWeight: 700, fontSize: "13px" }}>{suggestedProduct.productCode}</span>
                                    <div className="confidence-bar" style={{ width: "80px" }}>
                                        <div className="confidence-fill" style={{ width: `${Math.round(confidence * 100)}%`, background: confColor }} />
                                    </div>
                                    <span style={{ fontSize: "12px", color: confColor }}>{Math.round(confidence * 100)}% match</span>
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{suggestedProduct.description}</div>
                                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                                    {suggestedProduct.listPrice > 0 && (
                                        <span style={{ color: "var(--muted)", textDecoration: "line-through", marginRight: "6px" }}>
                                            {formatCurrency(suggestedProduct.listPrice, "PKR")}
                                        </span>
                                    )}
                                    <span style={{ fontWeight: 700, color: "var(--success)" }}>
                                        {formatCurrency(suggestedProduct.netCost, "PKR")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: "4px 0" }}>
                            <div style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic", marginBottom: "4px" }}>
                                No match found in product index {validBrand ? `for brand "${validBrand}"` : ""}
                            </div>
                            {validBrand && (
                                <div style={{ fontSize: "11px", color: "var(--warning)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>⚠️</span>
                                    <span>
                                        No {validBrand} price list has been indexed. Upload an {validBrand} price list in{" "}
                                        <a href="/price-lists" style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: 600 }}>
                                            Price Lists
                                        </a>{" "}
                                        to match this item.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                    <span className={`badge ${statusColor}`}>{status}</span>
                    {status === "pending" && suggestedProduct && confidence >= 0.5 && (
                        <button className="btn-success btn-sm" onClick={onAccept}>✓ Accept</button>
                    )}
                    <button className="btn-secondary btn-sm" onClick={() => setShowAlts(!showAlts)}>
                        {showAlts ? "Hide" : "Alternatives"}
                    </button>
                    {status !== "rejected" && (
                        <button className="btn-danger btn-sm" onClick={onReject}>✕</button>
                    )}
                </div>
            </div>

            {/* Alternatives / Manual Search */}
            {showAlts && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ marginBottom: "8px" }}>
                        <input
                            className="input" placeholder="Search for alternative..."
                            value={manualSearch} onChange={(e) => setManualSearch(e.target.value)}
                            style={{ fontSize: "13px" }}
                        />
                    </div>
                    {(manualSearch ? manualResults : alternatives.map((p) => ({ product: p, score: 0.7, matchType: "fuzzy" as const }))).map((r) => (
                        <div key={r.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--muted-bg)", borderRadius: "6px", marginBottom: "4px" }}>
                            <div>
                                <span className="badge badge-blue" style={{ marginRight: "8px" }}>{r.product.brand}</span>
                                <span style={{ fontWeight: 600, fontSize: "12px" }}>{r.product.productCode}</span>
                                <span style={{ color: "var(--muted)", fontSize: "12px", marginLeft: "8px" }}>{r.product.description}</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <span style={{ fontWeight: 600, color: "var(--success)", fontSize: "12px" }}>
                                    {formatCurrency(r.product.netCost, "PKR")}
                                </span>
                                <button className="btn-primary btn-sm" onClick={() => { onSelectAlternative(r.product); setShowAlts(false); }}>
                                    Select
                                </button>
                            </div>
                        </div>
                    ))}
                    {manualSearch && manualResults.length === 0 && (
                        <div style={{ color: "var(--muted)", fontSize: "13px" }}>No results for "{manualSearch}"</div>
                    )}
                </div>
            )}
        </div>
    );
}

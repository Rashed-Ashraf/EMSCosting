"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { searchProducts } from "@/lib/search/productSearch";
import { matchBlindQuotation, parseElectricalQuery, type ParsedElectricalSpec } from "@/lib/search/blindQuotation";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import type { BOQItem, Product, SearchResult } from "@/lib/types";

export interface RequirementWizardItem {
    item: BOQItem;
    spec: ParsedElectricalSpec;
    options: (SearchResult & { specDetails?: string })[];
    selectedProductId: string | null;
    status: "pending" | "confirmed" | "skipped";
    qty: number;
}

interface RequirementWizardProps {
    isOpen: boolean;
    onClose: () => void;
    rawItems: BOQItem[];
    fileName: string;
    products: Product[];
    brands: string[];
    currency?: string;
    initialIndex?: number;
    onConfirmItem: (product: Product, qty: number, lineNo: number, customDesc?: string) => void;
    onFinished: () => void;
}

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

export default function RequirementWizard({
    isOpen,
    onClose,
    rawItems,
    fileName,
    products,
    brands,
    currency = "PKR",
    initialIndex = 0,
    onConfirmItem,
    onFinished,
}: RequirementWizardProps) {
    const [wizardItems, setWizardItems] = useState<RequirementWizardItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    const [searchRefinement, setSearchRefinement] = useState("");
    const [brandOverride, setBrandOverride] = useState<string>("all");
    const [isCompleted, setIsCompleted] = useState(false);
    const pillContainerRef = useRef<HTMLDivElement>(null);

    // Sync initialIndex when wizard opens
    useEffect(() => {
        if (typeof initialIndex === "number" && initialIndex >= 0) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    // Initialize wizard items with spec extraction & catalog model checking
    useEffect(() => {
        if (!rawItems || rawItems.length === 0) {
            setWizardItems([]);
            return;
        }

        const initialized: RequirementWizardItem[] = rawItems.map((item) => {
            // 1. Extract Electrical Specifications (Category, Readings: Amps, Poles, kA, Voltage, Brand)
            const spec = parseElectricalQuery(item.description);
            const rawB = item.brand && !isInvalidBrand(item.brand) ? item.brand : undefined;
            const effectiveBrand = rawB || spec.brand;

            // 2. Perform Catalog Search
            // 2a. Search by extracted model code if present (e.g. NXM-250S, NXB-63, XB7EV)
            let modelResults: ReturnType<typeof searchProducts> = [];
            if (item.model) {
                modelResults = searchProducts(item.model, products, 15);
            }

            // 2b. Standard code / keyword search
            const stdResults = searchProducts(item.description, products, 15);

            // 2c. Blind Spec matching
            const blindResults = matchBlindQuotation(item.description, products, 15);

            // 2d. Structured spec search
            let structuredResults: ReturnType<typeof matchBlindQuotation> = [];
            if (spec.componentType || spec.currentNumeric || effectiveBrand) {
                structuredResults = matchBlindQuotation(
                    {
                        brand: effectiveBrand,
                        componentType: spec.componentType,
                        currentRating: spec.currentRating,
                        poles: spec.poles,
                        breakingCapacity: spec.breakingCapacity,
                    },
                    products,
                    15
                );
            }

            // Combine without duplicates
            const seen = new Set<string>();
            const combined: (SearchResult & { specDetails?: string; isDirectRequirement?: boolean })[] = [];

            // Add model match results first (highest specificity)
            for (const mr of modelResults) {
                if (!seen.has(mr.product.id)) {
                    seen.add(mr.product.id);
                    combined.push({
                        ...mr,
                        score: Math.max(mr.score, 0.95),
                        specDetails: `Model Match: ${mr.product.productCode}`,
                    });
                }
            }

            // Add blind results
            for (const br of [...blindResults, ...structuredResults]) {
                if (!seen.has(br.product.id)) {
                    seen.add(br.product.id);
                    combined.push({
                        product: br.product,
                        score: br.score,
                        matchType: br.score >= 0.8 ? "exact" : "fuzzy",
                        specDetails: br.matchedSpecsSummary,
                    });
                }
            }

            // Add standard text search results
            for (const sr of stdResults) {
                if (!seen.has(sr.product.id)) {
                    seen.add(sr.product.id);
                    combined.push(sr);
                }
            }

            // 3. Document-Specified Model & Price Extraction
            const reqBrand = effectiveBrand || "Specified Brand";
            // Strip duplicate brand prefix from model code if already present (e.g. "Chint NXM-250S" with brand "Chint" -> "NXM-250S")
            let reqCode = item.model || (spec.componentType ? `${spec.componentType}-${spec.currentRating || "REQ"}` : "MODEL-REQ");
            if (reqBrand && reqCode.toLowerCase().startsWith(reqBrand.toLowerCase())) {
                reqCode = reqCode.slice(reqBrand.length).trim() || reqCode;
            }

            // Extract price of the model:
            // First check if price was directly mentioned in requirement document
            let reqPrice = (typeof item.unitPrice === "number" && item.unitPrice > 0) ? item.unitPrice : 0;
            let extractedPriceSource = "";

            // If no price in document, EXTRACT THE PRICE OF THE MODEL FROM CATALOG / PRICE LISTS
            if (!reqPrice) {
                // Search products for this model code (with or without brand)
                const rawSearchModel = (item.model || reqCode).toLowerCase().replace(/[\s\-_]/g, "");
                const matchedInCatalog = products.find((p) => {
                    const pCode = p.productCode.toLowerCase().replace(/[\s\-_]/g, "");
                    const matchesCode = pCode === rawSearchModel || pCode.includes(rawSearchModel) || rawSearchModel.includes(pCode);
                    const matchesBrand = !effectiveBrand || p.brand.toLowerCase() === effectiveBrand.toLowerCase();
                    return matchesCode && matchesBrand && (p.listPrice > 0 || p.netCost > 0);
                });

                if (matchedInCatalog) {
                    reqPrice = matchedInCatalog.netCost || matchedInCatalog.listPrice;
                    extractedPriceSource = `Extracted from ${matchedInCatalog.brand} Price List`;
                } else if (combined.length > 0) {
                    const pricedCandidate = combined.find((c) => (c.product.netCost > 0 || c.product.listPrice > 0));
                    if (pricedCandidate) {
                        reqPrice = pricedCandidate.product.netCost || pricedCandidate.product.listPrice;
                        extractedPriceSource = `Extracted from Catalog (${pricedCandidate.product.productCode})`;
                    }
                }

                // Populate extracted price onto item so UI knows its extracted price
                if (reqPrice > 0) {
                    item.unitPrice = reqPrice;
                    if (!item.totalPrice) {
                        item.totalPrice = reqPrice * (item.qty || 1);
                    }
                }
            }

            const directReqOption: SearchResult & { specDetails?: string; isDirectRequirement?: boolean } = {
                product: {
                    id: `req-direct-${item.id}`,
                    productCode: reqCode,
                    brand: reqBrand,
                    productName: item.description,
                    description: item.description,
                    listPrice: reqPrice,
                    discount: 0,
                    netCost: reqPrice,
                    currency: item.currency || currency || "PKR",
                    priceListId: "requirement-file",
                    category: item.category || spec.componentType || "Requirement Item",
                    unit: item.unit || "Pcs",
                },
                score: combined.length === 0 ? 1.0 : 0.90,
                matchType: "exact",
                specDetails: reqPrice > 0
                    ? (extractedPriceSource
                        ? `⚡ Model Price Extracted: PKR ${reqPrice.toLocaleString()} (${extractedPriceSource})`
                        : `Requirement Specified · Listed Price: PKR ${reqPrice.toLocaleString()}`)
                    : `Requirement Specified Model (${reqBrand} ${reqCode})`,
                isDirectRequirement: true,
            };

            // If no catalog models found, direct option is only option and top candidate
            if (combined.length === 0) {
                combined.push(directReqOption);
            } else {
                // Also provide direct option at top or alongside catalog models
                combined.unshift(directReqOption);
            }

            // Sort by match score descending, then price
            combined.sort((a, b) => b.score - a.score || a.product.netCost - b.product.netCost);

            // Pre-select top candidate
            const topCandidate = combined[0]?.product.id || null;

            return {
                item,
                spec,
                options: combined,
                selectedProductId: topCandidate,
                status: "pending",
                qty: item.qty || 1,
            };
        });

        setWizardItems(initialized);
        setIsCompleted(false);
    }, [rawItems, products, currency]);

    // Reset filters when moving to a new item
    useEffect(() => {
        setSearchRefinement("");
        setBrandOverride("all");
    }, [currentIndex]);

    // Scroll active step pill into view
    useEffect(() => {
        if (pillContainerRef.current) {
            const activePill = pillContainerRef.current.children[currentIndex] as HTMLElement;
            if (activePill) {
                activePill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }
    }, [currentIndex]);

    const currentWizardItem = wizardItems[currentIndex];
    const totalItems = wizardItems.length;

    // Filter candidate options based on user refinement and brand override
    const displayedOptions = useMemo(() => {
        if (!currentWizardItem) return [];

        let list = currentWizardItem.options;

        // If user entered a manual search refinement in the wizard
        if (searchRefinement.trim()) {
            const refined = searchProducts(searchRefinement, products, 20);
            const refinedBlind = matchBlindQuotation(searchRefinement, products, 20);
            const seen = new Set<string>();
            const combined: (SearchResult & { specDetails?: string })[] = [];

            for (const br of refinedBlind) {
                if (!seen.has(br.product.id)) {
                    seen.add(br.product.id);
                    combined.push({
                        product: br.product,
                        score: br.score,
                        matchType: br.score >= 0.8 ? "exact" : "fuzzy",
                        specDetails: br.matchedSpecsSummary,
                    });
                }
            }
            for (const sr of refined) {
                if (!seen.has(sr.product.id)) {
                    seen.add(sr.product.id);
                    combined.push(sr);
                }
            }
            list = combined;
        }

        // Brand override filter
        if (brandOverride !== "all") {
            list = list.filter((opt) => opt.product.brand.toLowerCase() === brandOverride.toLowerCase());
        }

        return list;
    }, [currentWizardItem, searchRefinement, brandOverride, products]);

    const selectedProduct = useMemo(() => {
        if (!currentWizardItem || !currentWizardItem.selectedProductId) return null;
        return (
            displayedOptions.find((o) => o.product.id === currentWizardItem.selectedProductId)?.product ||
            products.find((p) => p.id === currentWizardItem.selectedProductId) ||
            null
        );
    }, [currentWizardItem, displayedOptions, products]);

    const handleSelectOption = (productId: string) => {
        setWizardItems((prev) =>
            prev.map((it, idx) => (idx === currentIndex ? { ...it, selectedProductId: productId } : it))
        );
    };

    const handleUpdateQty = (newQty: number) => {
        setWizardItems((prev) =>
            prev.map((it, idx) => (idx === currentIndex ? { ...it, qty: newQty } : it))
        );
    };

    const handleUpdateOptionPrice = (productId: string, newPrice: number) => {
        setWizardItems((prev) =>
            prev.map((it, idx) => {
                if (idx !== currentIndex) return it;
                return {
                    ...it,
                    options: it.options.map((opt) => {
                        if (opt.product.id === productId) {
                            return {
                                ...opt,
                                product: {
                                    ...opt.product,
                                    listPrice: newPrice,
                                    netCost: newPrice,
                                },
                            };
                        }
                        return opt;
                    }),
                };
            })
        );
    };

    const handleConfirmAndNext = () => {
        if (!currentWizardItem || !selectedProduct) return;

        // Confirm to costing
        onConfirmItem(
            selectedProduct,
            currentWizardItem.qty,
            currentWizardItem.item.lineNo,
            currentWizardItem.item.description
        );

        // Mark as confirmed
        const updated = wizardItems.map((it, idx) =>
            idx === currentIndex ? { ...it, status: "confirmed" as const } : it
        );
        setWizardItems(updated);

        // Advance to next pending item, or next sequential item
        if (currentIndex < totalItems - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Check if any pending items remain
            const nextPending = updated.findIndex((it) => it.status === "pending");
            if (nextPending >= 0) {
                setCurrentIndex(nextPending);
            } else {
                setIsCompleted(true);
            }
        }
    };

    const handleSkip = () => {
        const updated = wizardItems.map((it, idx) =>
            idx === currentIndex ? { ...it, status: "skipped" as const } : it
        );
        setWizardItems(updated);

        if (currentIndex < totalItems - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            const nextPending = updated.findIndex((it) => it.status === "pending");
            if (nextPending >= 0) {
                setCurrentIndex(nextPending);
            } else {
                setIsCompleted(true);
            }
        }
    };

    const confirmedCount = wizardItems.filter((it) => it.status === "confirmed").length;
    const skippedCount = wizardItems.filter((it) => it.status === "skipped").length;

    // Available brands across all candidate models or store brands
    const candidateBrands = Array.from(
        new Set([
            ...brands,
            ...(currentWizardItem?.options.map((o) => o.product.brand) || []),
        ].filter(Boolean))
    );

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
            <div
                className="modal-box"
                style={{
                    maxWidth: "960px",
                    width: "95vw",
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    overflow: "hidden",
                    borderRadius: "16px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "18px 24px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--card)",
                    }}
                >
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "22px" }}>⚡</span>
                            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
                                Requirement Matching & Model Selection
                            </h2>
                            <span className="badge badge-purple">
                                {fileName || "Requirement File"}
                            </span>
                        </div>
                        <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "4px", marginBottom: 0 }}>
                            Reviewing Item {currentIndex + 1} of {totalItems} · {confirmedCount} confirmed · {skippedCount} skipped
                        </p>
                    </div>
                    <button
                        className="btn-ghost btn-sm"
                        onClick={onClose}
                        style={{ fontSize: "16px", padding: "4px 8px" }}
                        title="Close Wizard"
                    >
                        ✕
                    </button>
                </div>

                {/* All Items Navigation Pill Bar */}
                <div
                    ref={pillContainerRef}
                    style={{
                        display: "flex",
                        gap: "6px",
                        padding: "10px 24px",
                        background: "var(--muted-bg)",
                        borderBottom: "1px solid var(--border)",
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                    }}
                >
                    {wizardItems.map((wItem, idx) => {
                        const isActive = idx === currentIndex;
                        const isConfirmed = wItem.status === "confirmed";
                        const isSkipped = wItem.status === "skipped";

                        let bg = "var(--card)";
                        let border = "1px solid var(--border)";
                        let color = "var(--foreground)";

                        if (isActive) {
                            bg = "rgba(59, 130, 246, 0.15)";
                            border = "2px solid var(--accent)";
                            color = "var(--accent)";
                        } else if (isConfirmed) {
                            bg = "rgba(34, 197, 94, 0.12)";
                            border = "1px solid rgba(34, 197, 94, 0.3)";
                            color = "var(--success)";
                        } else if (isSkipped) {
                            bg = "rgba(245, 158, 11, 0.1)";
                            border = "1px solid rgba(245, 158, 11, 0.3)";
                            color = "var(--warning)";
                        }

                        return (
                            <button
                                key={wItem.item.id}
                                type="button"
                                onClick={() => {
                                    setCurrentIndex(idx);
                                    setIsCompleted(false);
                                }}
                                style={{
                                    background: bg,
                                    border,
                                    color,
                                    borderRadius: "8px",
                                    padding: "5px 12px",
                                    fontSize: "12px",
                                    fontWeight: isActive ? 700 : 500,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    flexShrink: 0,
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <span>#{wItem.item.lineNo}</span>
                                <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {wItem.item.description}
                                </span>
                                {isConfirmed && <span>✅</span>}
                                {isSkipped && <span>⏭️</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                    {isCompleted ? (
                        <div style={{ textAlign: "center", padding: "40px 20px" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                                All Requirement Items Processed!
                            </h3>
                            <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "480px", margin: "0 auto 24px" }}>
                                You have reviewed all <strong>{totalItems}</strong> requirement items. <strong>{confirmedCount}</strong> products have been added to your Costing sheet.
                            </p>
                            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setIsCompleted(false);
                                        setCurrentIndex(0);
                                    }}
                                >
                                    Review Items Again
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        onClose();
                                        onFinished();
                                    }}
                                >
                                    Open Costing Sheet →
                                </button>
                            </div>
                        </div>
                    ) : currentWizardItem ? (
                        <div>
                            {/* Current Requirement Specification Card */}
                            <div
                                style={{
                                    background: "var(--muted-bg)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "16px 20px",
                                    marginBottom: "18px",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "4px" }}>
                                            Original Requirement (Line #{currentWizardItem.item.lineNo})
                                        </div>
                                        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}>
                                            {currentWizardItem.item.description}
                                        </div>
                                    </div>

                                    {/* Quantity Editor */}
                                    <div style={{ background: "var(--card)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "right" }}>
                                        <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Requirement Qty</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <input
                                                type="number"
                                                min="1"
                                                value={currentWizardItem.qty}
                                                onChange={(e) => handleUpdateQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                style={{
                                                    width: "60px",
                                                    padding: "4px 8px",
                                                    borderRadius: "6px",
                                                    background: "var(--input-bg)",
                                                    border: "1px solid var(--border)",
                                                    color: "var(--foreground)",
                                                    fontWeight: 700,
                                                    fontSize: "14px",
                                                    textAlign: "center",
                                                }}
                                            />
                                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                                {currentWizardItem.item.unit || "EA"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Extracted Specs Badges */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed var(--border)" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Extracted Specs:</span>
                                    {(currentWizardItem.item.category || currentWizardItem.spec.componentType) && (
                                        <span className="badge badge-purple">🏷️ Category: {currentWizardItem.item.category || currentWizardItem.spec.componentType}</span>
                                    )}
                                    {currentWizardItem.item.model && (
                                        <span className="badge badge-purple" style={{ fontWeight: 700 }}>📦 Model: {currentWizardItem.item.model}</span>
                                    )}
                                    {currentWizardItem.spec.currentRating && (
                                        <span className="badge badge-green">⚡ Rating: {currentWizardItem.spec.currentRating}</span>
                                    )}
                                    {currentWizardItem.spec.poles && (
                                        <span className="badge badge-blue">🔌 Poles: {currentWizardItem.spec.poles}</span>
                                    )}
                                    {currentWizardItem.spec.breakingCapacity && (
                                        <span className="badge badge-yellow">💥 Capacity: {currentWizardItem.spec.breakingCapacity}</span>
                                    )}
                                    {(() => {
                                        const rawB = currentWizardItem.item.brand && !isInvalidBrand(currentWizardItem.item.brand) ? currentWizardItem.item.brand : undefined;
                                        const wBrand = rawB || currentWizardItem.spec.brand;
                                        return wBrand ? (
                                            <span className="badge badge-blue">🏢 Brand: {wBrand}</span>
                                        ) : (
                                            <span className="badge badge-gray">🏢 Brand: Not specified</span>
                                        );
                                    })()}
                                    {currentWizardItem.spec.curve && (
                                        <span className="badge badge-gray">📈 {currentWizardItem.spec.curve}</span>
                                    )}
                                </div>

                                {/* Extracted Mentioned Price Banner (from requirement file) */}
                                {typeof currentWizardItem.item.unitPrice === "number" && currentWizardItem.item.unitPrice > 0 && (
                                    <div
                                        style={{
                                            marginTop: "12px",
                                            background: "rgba(34, 197, 94, 0.1)",
                                            border: "1px solid rgba(34, 197, 94, 0.3)",
                                            borderRadius: "8px",
                                            padding: "8px 14px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: "8px",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "16px" }}>💰</span>
                                            <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}>
                                                Mentioned Price in Document:
                                            </span>
                                            <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--success)" }}>
                                                PKR {currentWizardItem.item.unitPrice.toLocaleString()} / {currentWizardItem.item.unit || "Pcs"}
                                            </span>
                                        </div>
                                        {typeof currentWizardItem.item.totalPrice === "number" && currentWizardItem.item.totalPrice > 0 && (
                                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                                Extracted Line Total: <strong style={{ color: "var(--foreground)" }}>PKR {currentWizardItem.item.totalPrice.toLocaleString()}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Catalog Options Section */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                                    <div>
                                        <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                                            Available Models Found in Catalog ({displayedOptions.length})
                                        </h3>
                                        <p style={{ color: "var(--muted)", fontSize: "12px", margin: "2px 0 0 0" }}>
                                            Select the model you wish to use for this requirement line item
                                        </p>
                                    </div>

                                    {/* Search refinement & brand filter */}
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <input
                                            className="input"
                                            style={{ fontSize: "12px", height: "32px", width: "190px", padding: "4px 10px" }}
                                            placeholder="Refine model code/desc..."
                                            value={searchRefinement}
                                            onChange={(e) => setSearchRefinement(e.target.value)}
                                        />
                                        <select
                                            className="select"
                                            style={{ fontSize: "12px", height: "32px", padding: "4px 8px" }}
                                            value={brandOverride}
                                            onChange={(e) => setBrandOverride(e.target.value)}
                                        >
                                            <option value="all">All Brands</option>
                                            {candidateBrands.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Model Candidates List */}
                                {displayedOptions.length === 0 ? (
                                    <div
                                        style={{
                                            padding: "32px 20px",
                                            textAlign: "center",
                                            background: "rgba(245, 158, 11, 0.08)",
                                            border: "1px solid rgba(245, 158, 11, 0.25)",
                                            borderRadius: "10px",
                                            color: "var(--warning)",
                                        }}
                                    >
                                        <div style={{ fontSize: "24px", marginBottom: "6px" }}>🔍</div>
                                        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                                            No matching catalog models found for these specifications
                                        </div>
                                        <p style={{ fontSize: "12px", color: "var(--muted)", maxWidth: "460px", margin: "0 auto 12px" }}>
                                            Try switching the brand filter above, typing a part code in the search refinement box, or skip this item.
                                        </p>
                                        <button className="btn-secondary btn-sm" onClick={handleSkip}>
                                            ⏭️ Skip this Requirement
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            maxHeight: "360px",
                                            overflowY: "auto",
                                            paddingRight: "4px",
                                        }}
                                    >
                                        {displayedOptions.map((opt) => {
                                            const isSelected = opt.product.id === currentWizardItem.selectedProductId;

                                            return (
                                                <div
                                                    key={opt.product.id}
                                                    onClick={() => handleSelectOption(opt.product.id)}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                        padding: "12px 16px",
                                                        borderRadius: "10px",
                                                        background: isSelected ? "rgba(59, 130, 246, 0.08)" : "var(--muted-bg)",
                                                        border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                                                        cursor: "pointer",
                                                        transition: "all 0.15s ease",
                                                    }}
                                                >
                                                    {/* Selection Radio Indicator */}
                                                    <div
                                                        style={{
                                                            width: "20px",
                                                            height: "20px",
                                                            borderRadius: "50%",
                                                            border: isSelected ? "6px solid var(--accent)" : "2px solid var(--border)",
                                                            background: "var(--card)",
                                                            flexShrink: 0,
                                                            transition: "all 0.15s ease",
                                                        }}
                                                    />

                                                    {/* Model Details */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                                                            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                                                                {opt.product.productCode}
                                                            </span>
                                                            <span className="badge badge-blue">
                                                                {opt.product.brand}
                                                            </span>
                                                            <span
                                                                className={`badge ${
                                                                    opt.score >= 0.8 ? "badge-green" : opt.score >= 0.5 ? "badge-yellow" : "badge-gray"
                                                                }`}
                                                            >
                                                                {Math.round(opt.score * 100)}% Match
                                                            </span>
                                                            {opt.specDetails && (
                                                                <span
                                                                    style={{
                                                                        fontSize: "11px",
                                                                        background: "rgba(34, 197, 94, 0.12)",
                                                                        color: "var(--success)",
                                                                        padding: "2px 6px",
                                                                        borderRadius: "4px",
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    ⚡ {opt.specDetails}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--muted)",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {opt.product.description}
                                                        </div>
                                                    </div>

                                                    {/* Price Details */}
                                                    <div style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                                                        {(opt as any).isDirectRequirement ? (
                                                            <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                                                                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>
                                                                    Unit Price (PKR)
                                                                </div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                                                                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>PKR</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={opt.product.netCost || ""}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                                                                            handleUpdateOptionPrice(opt.product.id, val);
                                                                        }}
                                                                        placeholder="0"
                                                                        style={{
                                                                            width: "110px",
                                                                            padding: "4px 8px",
                                                                            borderRadius: "6px",
                                                                            background: "var(--card)",
                                                                            border: "1.5px solid var(--accent)",
                                                                            color: "var(--foreground)",
                                                                            fontWeight: 700,
                                                                            fontSize: "13px",
                                                                            textAlign: "right",
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div style={{ fontSize: "11px", color: "var(--muted)", textDecoration: "line-through" }}>
                                                                    {formatCurrency(opt.product.listPrice, currency)}
                                                                </div>
                                                                <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--success)" }}>
                                                                    {formatCurrency(opt.product.netCost, currency)}
                                                                </div>
                                                                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                                    Disc: {formatPercent(opt.product.discount)}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Controls */}
                {!isCompleted && currentWizardItem && (
                    <div
                        style={{
                            padding: "16px 24px",
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--card)",
                        }}
                    >
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                            >
                                ← Previous
                            </button>
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={handleSkip}
                            >
                                ⏭️ Skip Item
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                {selectedProduct ? `Selected: ${selectedProduct.productCode}` : "Select a model option"}
                            </span>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleConfirmAndNext}
                                disabled={!selectedProduct}
                                style={{ padding: "8px 20px" }}
                            >
                                ✅ Confirm & Next {currentIndex < totalItems - 1 ? `(Item ${currentIndex + 2} →)` : "(Finish)"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

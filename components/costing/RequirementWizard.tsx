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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl">⚡</span>
                            <h2 className="text-base font-bold text-foreground">
                                Requirement Matching & Model Selection
                            </h2>
                            <span className="badge badge-purple text-xs">
                                {fileName || "Requirement File"}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                            Reviewing Item {currentIndex + 1} of {totalItems} · {confirmedCount} confirmed · {skippedCount} skipped
                        </p>
                    </div>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted-bg text-base transition-colors"
                        onClick={onClose}
                        title="Close Wizard"
                    >
                        ✕
                    </button>
                </div>

                {/* All Items Navigation Pill Bar */}
                <div
                    ref={pillContainerRef}
                    className="flex gap-1.5 px-6 py-2.5 bg-muted-bg border-b border-border overflow-x-auto whitespace-nowrap shrink-0"
                >
                    {wizardItems.map((wItem, idx) => {
                        const isActive = idx === currentIndex;
                        const isConfirmed = wItem.status === "confirmed";
                        const isSkipped = wItem.status === "skipped";

                        let pillClass = "bg-card text-foreground border-border hover:bg-muted-bg/80";
                        if (isActive) {
                            pillClass = "bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-600 font-bold shadow-xs";
                        } else if (isConfirmed) {
                            pillClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                        } else if (isSkipped) {
                            pillClass = "bg-amber-500/10 text-amber-500 border-amber-500/30";
                        }

                        return (
                            <button
                                key={wItem.item.id}
                                type="button"
                                onClick={() => {
                                    setCurrentIndex(idx);
                                    setIsCompleted(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-colors ${pillClass}`}
                            >
                                <span className="font-mono">#{wItem.item.lineNo}</span>
                                <span className="max-w-[120px] truncate">
                                    {wItem.item.description}
                                </span>
                                {isConfirmed && <span>✅</span>}
                                {isSkipped && <span>⏭️</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isCompleted ? (
                        <div className="text-center py-12 px-4 space-y-3">
                            <div className="text-5xl">🎉</div>
                            <h3 className="text-xl font-bold text-foreground">
                                All Requirement Items Processed!
                            </h3>
                            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
                                You have reviewed all <strong>{totalItems}</strong> requirement items. <strong>{confirmedCount}</strong> products have been added to your Costing sheet.
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setIsCompleted(false);
                                        setCurrentIndex(0);
                                    }}
                                >
                                    Review Items Again
                                </button>
                                <button
                                    type="button"
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
                        <div className="space-y-4">
                            {/* Current Requirement Specification Card */}
                            <div className="p-4 rounded-xl bg-muted-bg/60 border border-border space-y-3">
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="text-[11px] text-muted uppercase font-bold tracking-wider">
                                            Original Requirement (Line #{currentWizardItem.item.lineNo})
                                        </div>
                                        <div className="text-base font-bold text-foreground leading-snug">
                                            {currentWizardItem.item.description}
                                        </div>
                                    </div>

                                    {/* Quantity Editor */}
                                    <div className="p-2.5 rounded-lg bg-card border border-border shrink-0 self-end sm:self-auto text-right">
                                        <label htmlFor="wizard-qty-input" className="text-[11px] text-muted block mb-1">Requirement Qty</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                id="wizard-qty-input"
                                                type="number"
                                                min="1"
                                                value={currentWizardItem.qty}
                                                onChange={(e) => handleUpdateQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 px-2 py-1 rounded-md bg-input-bg border border-input-border text-foreground font-bold text-xs text-center focus:border-blue-600 outline-none"
                                            />
                                            <span className="text-xs text-muted">
                                                {currentWizardItem.item.unit || "EA"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Extracted Specs Badges */}
                                <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-border/60">
                                    <span className="text-[11px] text-muted font-semibold">Extracted Specs:</span>
                                    {(currentWizardItem.item.category || currentWizardItem.spec.componentType) && (
                                        <span className="badge badge-purple">🏷️ Category: {currentWizardItem.item.category || currentWizardItem.spec.componentType}</span>
                                    )}
                                    {currentWizardItem.item.model && (
                                        <span className="badge badge-purple font-bold">📦 Model: {currentWizardItem.item.model}</span>
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
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">💰</span>
                                            <span className="font-semibold text-foreground">
                                                Mentioned Price in Document:
                                            </span>
                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                                PKR {currentWizardItem.item.unitPrice.toLocaleString()} / {currentWizardItem.item.unit || "Pcs"}
                                            </span>
                                        </div>
                                        {typeof currentWizardItem.item.totalPrice === "number" && currentWizardItem.item.totalPrice > 0 && (
                                            <div className="text-muted">
                                                Extracted Line Total: <strong className="text-foreground">PKR {currentWizardItem.item.totalPrice.toLocaleString()}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Catalog Options Section */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">
                                            Available Models Found in Catalog ({displayedOptions.length})
                                        </h3>
                                        <p className="text-xs text-muted">
                                            Select the model you wish to use for this requirement line item
                                        </p>
                                    </div>

                                    {/* Search refinement & brand filter */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="wizard-refine-input" className="sr-only">Refine model search</label>
                                        <input
                                            id="wizard-refine-input"
                                            className="input text-xs h-8 w-44"
                                            placeholder="Refine model code/desc..."
                                            value={searchRefinement}
                                            onChange={(e) => setSearchRefinement(e.target.value)}
                                        />
                                        <label htmlFor="wizard-brand-override" className="sr-only">Filter by brand</label>
                                        <select
                                            id="wizard-brand-override"
                                            className="select text-xs h-8 w-auto"
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
                                    <div className="p-8 text-center bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-600 dark:text-amber-400 space-y-2">
                                        <div className="text-2xl">🔍</div>
                                        <div className="font-semibold text-sm">
                                            No matching catalog models found for these specifications
                                        </div>
                                        <p className="text-xs text-muted max-w-md mx-auto">
                                            Try switching the brand filter above, typing a part code in the search refinement box, or skip this item.
                                        </p>
                                        <button type="button" className="btn-secondary btn-sm" onClick={handleSkip}>
                                            ⏭️ Skip this Requirement
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                        {displayedOptions.map((opt) => {
                                            const isSelected = opt.product.id === currentWizardItem.selectedProductId;

                                            return (
                                                <div
                                                    key={opt.product.id}
                                                    onClick={() => handleSelectOption(opt.product.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-blue-600/10 border-blue-600 ring-1 ring-blue-600/20"
                                                            : "bg-muted-bg/50 border-border hover:bg-muted-bg"
                                                    }`}
                                                >
                                                    {/* Selection Radio Indicator */}
                                                    <div
                                                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                            isSelected ? "border-blue-600 bg-blue-600" : "border-border bg-card"
                                                        }`}
                                                    >
                                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>

                                                    {/* Model Details */}
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-xs text-foreground font-mono">
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
                                                                <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                                                                    ⚡ {opt.specDetails}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted truncate">
                                                            {opt.product.description}
                                                        </div>
                                                    </div>

                                                    {/* Price Details */}
                                                    <div className="text-right whitespace-nowrap shrink-0">
                                                        {(opt as any).isDirectRequirement ? (
                                                            <div onClick={(e) => e.stopPropagation()} className="space-y-1">
                                                                <label htmlFor={`direct-price-${opt.product.id}`} className="text-[11px] text-muted block">
                                                                    Unit Price (PKR)
                                                                </label>
                                                                <div className="flex items-center gap-1 justify-end">
                                                                    <span className="text-xs text-muted">PKR</span>
                                                                    <input
                                                                        id={`direct-price-${opt.product.id}`}
                                                                        type="number"
                                                                        min="0"
                                                                        value={opt.product.netCost || ""}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                                                                            handleUpdateOptionPrice(opt.product.id, val);
                                                                        }}
                                                                        placeholder="0"
                                                                        className="w-24 px-2 py-1 rounded bg-card border border-blue-600 text-foreground font-bold text-xs text-right outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-xs text-muted line-through">
                                                                    {formatCurrency(opt.product.listPrice, currency)}
                                                                </div>
                                                                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(opt.product.netCost, currency)}
                                                                </div>
                                                                <div className="text-[11px] text-muted">
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
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card shrink-0">
                        <div className="flex items-center gap-2">
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

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted hidden sm:inline">
                                {selectedProduct ? `Selected: ${selectedProduct.productCode}` : "Select a model option"}
                            </span>
                            <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={handleConfirmAndNext}
                                disabled={!selectedProduct}
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

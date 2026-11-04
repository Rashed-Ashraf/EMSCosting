"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useEmsStore } from "@/stores/appStore";
import {
    parseElectricalQuery,
    matchBlindQuotation,
    getComponentCategories,
    STANDARD_CURRENT_RATINGS,
    STANDARD_KA_RATINGS,
    type BlindSearchFilters,
    type BlindQuotationResult,
    type ParsedElectricalSpec,
} from "@/lib/search/blindQuotation";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import Link from "next/link";

export default function BlindQuotationPage() {
    const { products, priceLists, addItemToCosting, costingSession } = useEmsStore();

    // Input mode: "smart" (NLP text parse) or "guided" (spec selectors)
    const [mode, setMode] = useState<"smart" | "guided">("smart");

    // Search query for Smart Mode
    const [smartQuery, setSmartQuery] = useState("");
    const [parsedSpec, setParsedSpec] = useState<ParsedElectricalSpec>({ keywords: [] });

    // Guided filters
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedCurrent, setSelectedCurrent] = useState("");
    const [selectedPoles, setSelectedPoles] = useState("");
    const [selectedKa, setSelectedKa] = useState("");
    const [selectedVoltage, setSelectedVoltage] = useState("");

    // Results & UI state
    const [results, setResults] = useState<BlindQuotationResult[]>([]);
    const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
    const [toast, setToast] = useState<string | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    // Available loaded brands + default brands
    const availableBrands = useMemo(() => {
        const loaded = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
        if (loaded.length > 0) return loaded;
        return ["Schneider Electric", "ABB", "Siemens", "Hager", "Legrand", "Clipsal", "Eaton", "Chint", "LS Electric"];
    }, [products]);

    const categories = useMemo(() => getComponentCategories(), []);

    // Perform Blind Search when inputs change
    useEffect(() => {
        clearTimeout(searchTimer.current!);
        searchTimer.current = setTimeout(() => {
            if (products.length === 0) {
                setResults([]);
                return;
            }

            if (mode === "smart") {
                if (!smartQuery.trim()) {
                    setParsedSpec({ keywords: [] });
                    setResults([]);
                    return;
                }
                const parsed = parseElectricalQuery(smartQuery);
                setParsedSpec(parsed);

                const res = matchBlindQuotation(
                    {
                        query: smartQuery,
                        brand: selectedBrand || undefined,
                    },
                    products,
                    50
                );
                setResults(res);
            } else {
                // Guided mode
                const hasAnyFilter = selectedBrand || selectedType || selectedCurrent || selectedPoles || selectedKa || selectedVoltage;
                if (!hasAnyFilter) {
                    setResults([]);
                    return;
                }

                const filters: BlindSearchFilters = {
                    brand: selectedBrand || undefined,
                    componentType: selectedType || undefined,
                    currentRating: selectedCurrent || undefined,
                    poles: selectedPoles || undefined,
                    breakingCapacity: selectedKa || undefined,
                    voltage: selectedVoltage || undefined,
                };
                const res = matchBlindQuotation(filters, products, 50);
                setResults(res);
            }
        }, 200);

        return () => clearTimeout(searchTimer.current!);
    }, [smartQuery, selectedBrand, selectedType, selectedCurrent, selectedPoles, selectedKa, selectedVoltage, mode, products]);

    const handleAddProduct = (result: BlindQuotationResult) => {
        const qty = qtyMap[result.product.id] || 1;
        for (let i = 0; i < qty; i++) {
            addItemToCosting(result.product);
        }
        showToast(`✅ Added ${qty}x ${result.product.productCode} (${result.product.brand}) to Costing`);
    };

    const handleClearAll = () => {
        setSmartQuery("");
        setSelectedBrand("");
        setSelectedType("");
        setSelectedCurrent("");
        setSelectedPoles("");
        setSelectedKa("");
        setSelectedVoltage("");
        setResults([]);
    };

    return (
        <div style={{ padding: "28px 32px", maxWidth: "100%" }}>
            {toast && (
                <div className="toast" style={{ borderLeft: `3px solid var(--success)` }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>
                        ⚡ Blind Quotation & Spec Finder
                    </h1>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                        Find catalog model codes, specs, and live pricing when the client gives only the <strong>Brand</strong> and <strong>Electrical Readings (Amps, Poles, kA, kW)</strong> without a model number.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {costingSession && costingSession.items.length > 0 && (
                        <Link href="/costing" className="btn-secondary">
                            🧮 View Costing ({costingSession.items.length} items)
                        </Link>
                    )}
                    <button className="btn-ghost btn-sm" onClick={handleClearAll}>
                        🔄 Reset Filters
                    </button>
                </div>
            </div>

            {/* Warning if no products loaded */}
            {products.length === 0 && (
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", fontSize: "13px", color: "var(--warning)" }}>
                    ⚠️ No price lists or products indexed yet. <Link href="/price-lists" style={{ color: "var(--accent)", fontWeight: 600 }}>Upload a price list (Schneider, ABB, Siemens, etc.) first →</Link>
                </div>
            )}

            {/* Mode Switcher Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                    onClick={() => setMode("smart")}
                    className={mode === "smart" ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 18px", fontSize: "13px" }}
                >
                    🧠 Smart Natural Spec Search (Paste RFQ)
                </button>
                <button
                    onClick={() => setMode("guided")}
                    className={mode === "guided" ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 18px", fontSize: "13px" }}
                >
                    🎛️ Guided Spec Builder (Brand + Readings)
                </button>
            </div>

            {/* Smart NLP Search Mode */}
            {mode === "smart" && (
                <div className="card" style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Enter Blind Client Specification
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Quick examples:</span>
                            {["Schneider 250A 3P 36kA MCCB", "ABB 100A 4P 25kA breaker", "Siemens contactor 15kW 230V", "Hager 32A 3P MCB Type C"].map((ex) => (
                                <button
                                    key={ex}
                                    className="badge badge-blue"
                                    style={{ cursor: "pointer", border: "none", background: "var(--muted-bg)" }}
                                    onClick={() => setSmartQuery(ex)}
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ position: "relative", marginBottom: "14px" }}>
                        <input
                            className="input"
                            style={{ paddingLeft: "38px", fontSize: "16px", height: "48px" }}
                            value={smartQuery}
                            onChange={(e) => setSmartQuery(e.target.value)}
                            placeholder="Type or paste inquiry: e.g. 'Schneider 250A 36kA 3P MCCB', 'ABB 4P 63A MCB', '15kW 415V contactor Siemens'..."
                        />
                        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px" }}>⚡</span>
                        {smartQuery && (
                            <button
                                onClick={() => setSmartQuery("")}
                                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "14px" }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Live Extracted Parameters Breakdown */}
                    {smartQuery && (
                        <div style={{ background: "var(--muted-bg)", borderRadius: "10px", padding: "12px 16px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                                🔍 AI Electrical Parameter Extraction:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                {parsedSpec.brand && (
                                    <span className="badge badge-blue" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        🏢 Brand: <strong>{parsedSpec.brand}</strong>
                                    </span>
                                )}
                                {parsedSpec.componentType && (
                                    <span className="badge badge-green" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        📦 Type: <strong>{parsedSpec.componentType}</strong>
                                    </span>
                                )}
                                {parsedSpec.currentRating && (
                                    <span className="badge badge-yellow" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        ⚡ Current: <strong>{parsedSpec.currentRating}</strong>
                                    </span>
                                )}
                                {parsedSpec.poles && (
                                    <span className="badge badge-blue" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        🔢 Poles: <strong>{parsedSpec.poles}</strong>
                                    </span>
                                )}
                                {parsedSpec.breakingCapacity && (
                                    <span className="badge badge-red" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        💥 Breaking: <strong>{parsedSpec.breakingCapacity}</strong>
                                    </span>
                                )}
                                {parsedSpec.powerRating && (
                                    <span className="badge badge-green" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        ⚙️ Power: <strong>{parsedSpec.powerRating}</strong>
                                    </span>
                                )}
                                {parsedSpec.voltage && (
                                    <span className="badge badge-gray" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        🔌 Voltage: <strong>{parsedSpec.voltage}</strong>
                                    </span>
                                )}
                                {parsedSpec.curve && (
                                    <span className="badge badge-gray" style={{ fontSize: "12px", padding: "4px 10px" }}>
                                        📈 Trip/Curve: <strong>{parsedSpec.curve}</strong>
                                    </span>
                                )}

                                {/* Optional Brand Filter override */}
                                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>Filter Brand:</span>
                                    <select
                                        className="select"
                                        style={{ fontSize: "12px", padding: "3px 8px", width: "auto" }}
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                        <option value="">All Brands</option>
                                        {availableBrands.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Guided Spec Builder Mode */}
            {mode === "guided" && (
                <div className="card" style={{ marginBottom: "20px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                        Configure Electrical Specifications
                    </div>

                    <div className="grid-3" style={{ gap: "16px", marginBottom: "16px" }}>
                        {/* Brand */}
                        <div className="form-group">
                            <label className="label">1. Brand Name</label>
                            <select
                                className="select"
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                            >
                                <option value="">Select or Any Brand</option>
                                {availableBrands.map((b) => (
                                    <option key={b} value={b}>⚡ {b}</option>
                                ))}
                            </select>
                        </div>

                        {/* Component Type */}
                        <div className="form-group">
                            <label className="label">2. Component Category</label>
                            <select
                                className="select"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c.type} value={c.type}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Poles */}
                        <div className="form-group">
                            <label className="label">3. Number of Poles</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {["1P", "2P", "3P", "4P"].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={selectedPoles === p ? "btn-primary" : "btn-secondary"}
                                        style={{ flex: 1, padding: "6px 0", fontSize: "12px", justifyContent: "center" }}
                                        onClick={() => setSelectedPoles(selectedPoles === p ? "" : p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Current Rating Chips & Input */}
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <label className="label" style={{ marginBottom: 0 }}>4. Current / Amperage Rating (Amps)</label>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Selected: <strong>{selectedCurrent || "None"}</strong></span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                            {STANDARD_CURRENT_RATINGS.map((amp) => (
                                <button
                                    key={amp}
                                    type="button"
                                    className={selectedCurrent === amp ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                                    style={{ fontSize: "11px", padding: "3px 8px" }}
                                    onClick={() => setSelectedCurrent(selectedCurrent === amp ? "" : amp)}
                                >
                                    {amp}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <input
                                className="input"
                                style={{ maxWidth: "200px", fontSize: "13px" }}
                                placeholder="Or type custom Amps e.g. 175"
                                value={selectedCurrent.replace(/[^0-9.]/g, "")}
                                onChange={(e) => setSelectedCurrent(e.target.value ? `${e.target.value}A` : "")}
                            />
                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Ampere (A)</span>
                        </div>
                    </div>

                    {/* Breaking Capacity (kA) & Voltage */}
                    <div className="grid-2" style={{ gap: "16px" }}>
                        <div>
                            <label className="label">5. Breaking Capacity (Short Circuit kA)</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {STANDARD_KA_RATINGS.map((ka) => (
                                    <button
                                        key={ka}
                                        type="button"
                                        className={selectedKa === ka ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                                        style={{ fontSize: "11px", padding: "3px 8px" }}
                                        onClick={() => setSelectedKa(selectedKa === ka ? "" : ka)}
                                    >
                                        {ka}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label">6. Voltage / Coil</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {["240V", "415V", "230VAC", "24VDC", "110VAC", "400V"].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={selectedVoltage === v ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                                        style={{ fontSize: "11px", padding: "3px 8px" }}
                                        onClick={() => setSelectedVoltage(selectedVoltage === v ? "" : v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Section */}
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                        <h2 className="section-title" style={{ fontSize: "16px" }}>
                            Matching Catalog Options ({results.length})
                        </h2>
                        <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>
                            Ranked by electrical spec compatibility & net cost
                        </p>
                    </div>
                    {results.length > 0 && (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span className="badge badge-green">
                                {results.filter((r) => r.score >= 0.8).length} Exact / High Spec Matches
                            </span>
                        </div>
                    )}
                </div>

                {results.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                        <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚡</div>
                        <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "6px", color: "var(--foreground)" }}>
                            {products.length === 0
                                ? "No product price lists loaded"
                                : (mode === "smart" && !smartQuery) || (mode === "guided" && !selectedBrand && !selectedType && !selectedCurrent)
                                ? "Enter brand & electrical readings above to find matching models"
                                : "No catalog models match all the specified electrical readings"}
                        </div>
                        <div style={{ fontSize: "13px" }}>
                            {products.length === 0 ? (
                                <Link href="/price-lists" style={{ color: "var(--accent)" }}>Upload your price lists in Price Lists page →</Link>
                            ) : (
                                "Try broadening your criteria (e.g. search with Amps + Brand only, or check alternatives)."
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {results.map((result) => {
                            const { product, score, matchDetails, matchedSpecsSummary } = result;
                            const qty = qtyMap[product.id] || 1;
                            const isHighMatch = score >= 0.8;

                            return (
                                <div
                                    key={product.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "14px 18px",
                                        background: isHighMatch ? "var(--card-bg)" : "var(--muted-bg)",
                                        borderRadius: "10px",
                                        border: isHighMatch ? "1px solid var(--accent)" : "1px solid var(--border)",
                                        boxShadow: isHighMatch ? "0 2px 10px rgba(59,130,246,0.08)" : "none",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    {/* Left: Product info & match badges */}
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                            <span className="badge badge-blue" style={{ fontWeight: 700 }}>
                                                {product.brand}
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)", fontFamily: "monospace" }}>
                                                {product.productCode}
                                            </span>
                                            <span className={`badge ${score >= 0.8 ? "badge-green" : score >= 0.6 ? "badge-yellow" : "badge-gray"}`}>
                                                {Math.round(score * 100)}% Spec Match
                                            </span>
                                            {product.category && (
                                                <span className="badge badge-gray" style={{ fontSize: "11px" }}>
                                                    {product.category}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500, marginBottom: "6px" }}>
                                            {product.description || product.productName}
                                        </div>

                                        {/* Matched Feature Tags */}
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Matched:</span>
                                            {matchDetails.matchedFeatures.map((f, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        fontSize: "11px",
                                                        background: "rgba(34,197,94,0.12)",
                                                        color: "var(--success)",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    ✓ {f}
                                                </span>
                                            ))}
                                            {matchDetails.missingFeatures.map((m, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        fontSize: "11px",
                                                        background: "rgba(239,68,68,0.08)",
                                                        color: "var(--muted)",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                    }}
                                                >
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Pricing & Add Action */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "12px", color: "var(--muted)", textDecoration: "line-through" }}>
                                                {formatCurrency(product.listPrice, product.currency || "AUD")}
                                            </div>
                                            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)" }}>
                                                {formatCurrency(product.netCost, product.currency || "AUD")}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                Disc: {formatPercent(product.discount)}
                                            </div>
                                        </div>

                                        {/* Qty selector */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Qty:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={qty}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    setQtyMap({ ...qtyMap, [product.id]: val });
                                                }}
                                                style={{
                                                    width: "50px",
                                                    background: "var(--input-bg)",
                                                    border: "1px solid var(--input-border)",
                                                    borderRadius: "6px",
                                                    padding: "4px 6px",
                                                    color: "var(--foreground)",
                                                    fontSize: "12px",
                                                    textAlign: "center",
                                                }}
                                            />
                                        </div>

                                        <button
                                            className="btn-primary"
                                            style={{ padding: "8px 14px", fontSize: "12px" }}
                                            onClick={() => handleAddProduct(result)}
                                        >
                                            + Add to Costing
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// ELECTRICAL MASTER — Advanced Price List Item Matching Engine
// Powered by Fuse.js with electrical term tokenization, synonym normalization,
// and multi-attribute confidence scoring.
// =============================================================================

import Fuse, { type IFuseOptions } from "fuse.js";
import type { Product, SearchResult } from "./types";
import { parseElectricalQuery } from "./search/blindQuotation";

export interface MatchResult extends SearchResult {
    confidence: number; // 0 - 100 percentage integer (e.g. 95)
    matchLabel: string; // e.g. "95% Match", "Exact Code"
    specDetails?: string; // e.g. "3P · 40A · MCCB"
}

export interface MatchingOptions {
    brand?: string;
    threshold?: number;
    limit?: number;
}

// ─── Electrical Synonyms & Normalization Dictionary ──────────────────────────

const POLE_SYNONYMS: Record<string, string> = {
    tp: "3p 3 pole",
    "triple pole": "3p 3 pole",
    fp: "4p 4 pole",
    "four pole": "4p 4 pole",
    dp: "2p 2 pole",
    "double pole": "2p 2 pole",
    sp: "1p 1 pole",
    "single pole": "1p 1 pole",
    tpn: "3p+n tpn 3 pole neutral",
    spn: "1p+n spn 1 pole neutral",
};

const COMPONENT_SYNONYMS: Record<string, string> = {
    "moulded case circuit breaker": "mccb",
    "molded case circuit breaker": "mccb",
    "miniature circuit breaker": "mcb",
    "air circuit breaker": "acb",
    "motor protection circuit breaker": "mpcb",
    "residual current circuit breaker": "rccb rcd",
    "residual current device": "rcd rccb",
    "residual current breaker with overload": "rcbo",
    "variable frequency drive": "vfd inverter drive",
    "automatic transfer switch": "ats changeover",
    "surge protective device": "spd surge arrester",
    "surge protection": "spd surge arrester",
    contactor: "contactor magnetic contactor",
    isolator: "isolator switch disconnector",
};

/**
 * Tokenize and normalize electrical search terms, resolving abbreviations and synonyms.
 * Example: "Schneider 3 Pole 40 Amp MCCB" -> "schneider 3p 3 pole 40a 40 amp mccb"
 */
export function tokenizeElectricalTerms(text: string): string {
    if (!text) return "";

    let normalized = text
        .toLowerCase()
        .replace(/[^\w\s\.\-\/\+]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // 1. Normalize Poles (3P, 3 Pole, 3-Pole, Triple Pole)
    normalized = normalized.replace(/\b([1-4])\s*(?:p|pole|poles)\b/g, "$1p $1 pole");
    for (const [synonym, replacement] of Object.entries(POLE_SYNONYMS)) {
        const regex = new RegExp(`\\b${synonym}\\b`, "g");
        normalized = normalized.replace(regex, replacement);
    }

    // 2. Normalize Amperage (40A, 40 A, 40Amp, 40 Amps, In=40A)
    normalized = normalized.replace(/\bin\s*[=:]?\s*(\d+(?:\.\d+)?)\s*a?\b/g, "$1a $1 amp");
    normalized = normalized.replace(/\b(\d+(?:\.\d+)?)\s*(?:a|amp|amps|amperes?)\b/g, "$1a $1 amp");

    // 3. Normalize Breaking Capacity (36kA, 36 kA, 36 kiloamps, Icu=36kA)
    normalized = normalized.replace(/\bicu\s*[=:]?\s*(\d+(?:\.\d+)?)\s*k?a?\b/g, "$1ka");
    normalized = normalized.replace(/\b(\d+(?:\.\d+)?)\s*(?:ka|kilo\s*amps?)\b/g, "$1ka $1 ka");

    // 4. Normalize Voltage (415V, 415VAC, 230V, 24VDC)
    normalized = normalized.replace(/\b(\d+)\s*v(?:ac|dc)?\b/g, "$1v");

    // 5. Expand Component Type Synonyms
    for (const [synonym, replacement] of Object.entries(COMPONENT_SYNONYMS)) {
        const regex = new RegExp(`\\b${synonym}\\b`, "g");
        normalized = normalized.replace(regex, replacement);
    }

    // 6. Brand normalization
    normalized = normalized.replace(/\bschneider(?:\s*electric)?\b/g, "schneider schneider electric");
    normalized = normalized.replace(/\bls(?:\s*electric)?\b/g, "ls ls electric");

    return normalized.replace(/\s+/g, " ").trim();
}

// ─── Enriched Product Representation for Indexing ─────────────────────────────

interface EnrichedProduct extends Product {
    _tokenizedCode: string;
    _tokenizedDesc: string;
    _tokenizedBrand: string;
    _tokenizedCategory: string;
}

let cachedFuseInstance: Fuse<EnrichedProduct> | null = null;
let lastIndexedCatalogSize = 0;
let lastIndexedBrand = "";

/**
 * Fuse.js configuration as per specification:
 * - productCode: 0.4
 * - description: 0.3
 * - brand: 0.2
 * - category: 0.1
 * - threshold: 0.3
 */
const FUSE_OPTIONS: IFuseOptions<EnrichedProduct> = {
    keys: [
        { name: "productCode", weight: 0.4 },
        { name: "description", weight: 0.3 },
        { name: "brand", weight: 0.2 },
        { name: "category", weight: 0.1 },
        // Secondary tokenized keys for robust electrical matching
        { name: "_tokenizedCode", weight: 0.35 },
        { name: "_tokenizedDesc", weight: 0.3 },
        { name: "_tokenizedBrand", weight: 0.2 },
        { name: "_tokenizedCategory", weight: 0.15 },
    ],
    threshold: 0.3, // Fuzzy matching tolerance
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
};

function enrichProduct(p: Product): EnrichedProduct {
    return {
        ...p,
        _tokenizedCode: tokenizeElectricalTerms(p.productCode),
        _tokenizedDesc: tokenizeElectricalTerms(p.description),
        _tokenizedBrand: tokenizeElectricalTerms(p.brand),
        _tokenizedCategory: tokenizeElectricalTerms(p.category || ""),
    };
}

/**
 * Builds or retrieves cached Fuse index
 */
function getFuseIndex(products: Product[], brandFilter?: string): Fuse<EnrichedProduct> {
    const brandKey = brandFilter || "all";
    if (
        !cachedFuseInstance ||
        products.length !== lastIndexedCatalogSize ||
        brandKey !== lastIndexedBrand
    ) {
        const pool = brandFilter && brandFilter !== "all"
            ? products.filter((p) => p.brand.toLowerCase() === brandFilter.toLowerCase())
            : products;

        const enriched = pool.map(enrichProduct);
        cachedFuseInstance = new Fuse(enriched, FUSE_OPTIONS);
        lastIndexedCatalogSize = products.length;
        lastIndexedBrand = brandKey;
    }
    return cachedFuseInstance;
}

/**
 * Force clear of cached index (e.g. after price list upload)
 */
export function invalidateMatchingEngineIndex(): void {
    cachedFuseInstance = null;
    lastIndexedCatalogSize = 0;
    lastIndexedBrand = "";
}

/**
 * Core Price List Item Matching Engine
 * Preprocesses queries, tokenizes electrical specs, performs weighted Fuse.js matching,
 * and attaches calibrated match confidence scores.
 */
export function matchPriceListItems(
    query: string,
    catalog: Product[],
    options: MatchingOptions = {}
): MatchResult[] {
    const cleanQuery = query.trim();
    if (!cleanQuery || catalog.length === 0) return [];

    const limit = options.limit ?? 35;
    const targetBrand = options.brand && options.brand !== "all" ? options.brand : undefined;

    // Filter candidate pool by brand if specified
    const pool = targetBrand
        ? catalog.filter((p) => p.brand.toLowerCase() === targetBrand.toLowerCase())
        : catalog;

    if (pool.length === 0) return [];

    const rawLower = cleanQuery.toLowerCase();
    const tokenizedQuery = tokenizeElectricalTerms(cleanQuery);
    const parsedSpec = parseElectricalQuery(cleanQuery);

    const results: MatchResult[] = [];
    const seenIds = new Set<string>();

    const addMatch = (
        product: Product,
        score: number,
        matchType: MatchResult["matchType"],
        specDetails?: string
    ) => {
        if (seenIds.has(product.id)) return;
        seenIds.add(product.id);

        const confidence = Math.max(1, Math.min(100, Math.round(score * 100)));
        const matchLabel =
            matchType === "exact"
                ? "100% Match"
                : `${confidence}% Match`;

        results.push({
            product,
            score,
            confidence,
            matchLabel,
            matchType,
            specDetails,
        });
    };

    // ── STAGE 1: Exact Product Code & Part Number Matches (100% Match) ───────────
    for (const p of pool) {
        const pCode = p.productCode.toLowerCase().trim();
        const pSku = p.sku?.toLowerCase().trim();
        if (pCode === rawLower || pSku === rawLower) {
            addMatch(p, 1.0, "exact");
        }
    }

    // ── STAGE 2: Code Prefix & Partial Matches (90% - 98% Match) ─────────────────
    for (const p of pool) {
        const pCode = p.productCode.toLowerCase();
        if (!seenIds.has(p.id) && rawLower.length >= 3) {
            if (pCode.startsWith(rawLower)) {
                addMatch(p, 0.98, "partial");
            } else if (pCode.includes(rawLower)) {
                addMatch(p, 0.92, "partial");
            }
        }
    }

    // ── STAGE 3: Electrical Specification & Readings Matching ────────────────────
    // Handles natural electrical RFQs like "Schneider 3P 40A MCCB" matching "LV431630"
    const hasElectricalSpecs = Boolean(
        parsedSpec.currentNumeric ||
        parsedSpec.poles ||
        parsedSpec.breakingCapacityNumeric ||
        parsedSpec.componentType
    );

    if (hasElectricalSpecs) {
        for (const p of pool) {
            if (seenIds.has(p.id)) continue;

            const descTokenized = tokenizeElectricalTerms(`${p.description} ${p.productCode} ${p.category || ""}`);
            const brandTokenized = tokenizeElectricalTerms(p.brand);

            let specScore = 0;
            let totalWeights = 0;
            const matchedFeatures: string[] = [];

            // 1. Brand match (Weight: 25)
            if (parsedSpec.brand) {
                totalWeights += 25;
                if (brandTokenized.includes(parsedSpec.brand.toLowerCase())) {
                    specScore += 25;
                }
            }

            // 2. Current rating match (Weight: 30)
            if (parsedSpec.currentRating) {
                totalWeights += 30;
                const ampToken = `${parsedSpec.currentNumeric}a`;
                if (descTokenized.includes(ampToken) || descTokenized.includes(`${parsedSpec.currentNumeric} a`)) {
                    specScore += 30;
                    matchedFeatures.push(parsedSpec.currentRating);
                }
            }

            // 3. Poles match (Weight: 25)
            if (parsedSpec.poles) {
                totalWeights += 25;
                const poleToken = parsedSpec.poles.toLowerCase();
                if (descTokenized.includes(poleToken)) {
                    specScore += 25;
                    matchedFeatures.push(parsedSpec.poles);
                }
            }

            // 4. Component type match (Weight: 20)
            if (parsedSpec.componentType) {
                totalWeights += 20;
                const typeToken = parsedSpec.componentType.toLowerCase();
                if (
                    descTokenized.includes(typeToken) ||
                    (p.category && p.category.toLowerCase().includes(typeToken))
                ) {
                    specScore += 20;
                    matchedFeatures.push(parsedSpec.componentType);
                }
            }

            // 5. Breaking capacity match (Weight: 15)
            if (parsedSpec.breakingCapacityNumeric) {
                totalWeights += 15;
                const kaToken = `${parsedSpec.breakingCapacityNumeric}ka`;
                if (descTokenized.includes(kaToken)) {
                    specScore += 15;
                    matchedFeatures.push(`${parsedSpec.breakingCapacityNumeric}kA`);
                }
            }

            if (totalWeights > 0 && specScore / totalWeights >= 0.7) {
                const ratio = specScore / totalWeights;
                // Calibrate confidence between 85% and 97%
                const finalConfidence = 0.85 + ratio * 0.12;
                addMatch(p, finalConfidence, "spec", matchedFeatures.join(" · "));
            }
        }
    }

    // ── STAGE 4: Weighted Fuse.js Fuzzy Matching ─────────────────────────────────
    const fuse = getFuseIndex(pool, targetBrand);
    const fuseResults = fuse.search(tokenizedQuery, { limit: limit * 2 });

    for (const res of fuseResults) {
        if (!seenIds.has(res.item.id)) {
            // Fuse score is 0 (best) to 1 (worst)
            const rawFuseScore = res.score ?? 0.3;
            // Invert to confidence score: score 0.05 -> 0.95
            const confidenceScore = Math.max(0.4, 1 - rawFuseScore);

            addMatch(
                res.item,
                confidenceScore,
                confidenceScore >= 0.85 ? "partial" : "fuzzy"
            );
        }
    }

    // ── Sort & Limit ─────────────────────────────────────────────────────────────
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
}


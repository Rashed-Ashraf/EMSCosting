// =============================================================================
// ELECTRICAL MASTER — Product Search Engine
// Uses: exact match → partial match → Fuse.js fuzzy match
// AI is only used if local search returns 0 results AND query is natural language
// =============================================================================

import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import type { Product, SearchResult } from "../types";

let fuseIndex: Fuse<Product> | null = null;
let lastIndexedCount = 0;

const FUSE_OPTIONS: IFuseOptions<Product> = {
    keys: [
        { name: "productCode", weight: 0.35 },
        { name: "sku", weight: 0.3 },
        { name: "productName", weight: 0.2 },
        { name: "description", weight: 0.15 },
        { name: "brand", weight: 0.1 },
        { name: "category", weight: 0.05 },
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
};

/**
 * Build or rebuild the Fuse.js index from the product array.
 * Caches the index so it is not rebuilt on every search.
 */
export function buildIndex(products: Product[]): void {
    if (products.length !== lastIndexedCount || fuseIndex === null) {
        fuseIndex = new Fuse(products, FUSE_OPTIONS);
        lastIndexedCount = products.length;
    }
}

/**
 * Force rebuild
 */
export function rebuildIndex(products: Product[]): void {
    fuseIndex = new Fuse(products, FUSE_OPTIONS);
    lastIndexedCount = products.length;
}

/**
 * Search the product index.
 * Returns up to `limit` results, ordered by relevance.
 */
export function searchProducts(
    query: string,
    products: Product[],
    limit = 50,
    targetBrand?: string
): SearchResult[] {
    if (!query.trim()) return [];
    const pool = targetBrand
        ? products.filter((p) => p.brand.toLowerCase() === targetBrand.toLowerCase())
        : products;
    if (pool.length === 0) return [];

    buildIndex(pool);

    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];
    const seenIds = new Set<string>();

    const addResult = (product: Product, score: number, matchType: SearchResult["matchType"]) => {
        if (!seenIds.has(product.id)) {
            seenIds.add(product.id);
            results.push({ product, score, matchType });
        }
    };

    // 1. Exact product code match
    for (const p of products) {
        if (p.productCode.toLowerCase() === q || p.sku?.toLowerCase() === q) {
            addResult(p, 1.0, "exact");
        }
    }

    // 2. Partial / starts-with match on product code or name
    for (const p of products) {
        const code = p.productCode.toLowerCase();
        const name = p.productName.toLowerCase();
        const desc = p.description.toLowerCase();
        if (
            !seenIds.has(p.id) &&
            (code.includes(q) || name.includes(q) || desc.includes(q))
        ) {
            addResult(p, 0.85, "partial");
        }
    }

    // 3. Token matching (each word in query must appear somewhere)
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    if (tokens.length > 1) {
        for (const p of products) {
            if (seenIds.has(p.id)) continue;
            const searchable = [
                p.productCode,
                p.productName,
                p.description,
                p.brand,
                p.category ?? "",
            ]
                .join(" ")
                .toLowerCase();
            const allMatch = tokens.every((t) => searchable.includes(t));
            if (allMatch) {
                addResult(p, 0.75, "partial");
            }
        }
    }

    // 4. Fuse.js fuzzy match
    if (fuseIndex) {
        const fuseResults = fuseIndex.search(query, { limit: limit * 2 });
        for (const r of fuseResults) {
            // Fuse score is 0=perfect, 1=worst; we invert
            const score = r.score !== undefined ? 1 - r.score : 0.5;
            if (score < 0.3) continue;
            addResult(r.item, score, "fuzzy");
        }
    }

    // Sort by score desc, then limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Brand filter on top of search results
 */
export function filterByBrand(
    results: SearchResult[],
    brand: string
): SearchResult[] {
    if (!brand) return results;
    return results.filter(
        (r) => r.product.brand.toLowerCase() === brand.toLowerCase()
    );
}

/**
 * Get all unique brands from the product index
 */
export function getUniqueBrands(products: Product[]): string[] {
    const brands = new Set(products.map((p) => p.brand));
    return Array.from(brands).sort();
}

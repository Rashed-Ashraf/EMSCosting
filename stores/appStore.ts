// =============================================================================
// ELECTRICAL MASTER — Zustand Global App Store (In-Memory MVP)
// =============================================================================
"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { indexedDbStorage } from "./storage";
import type {
    AppState,
    PriceListMeta,
    Product,
    CostingSession,
    CostingItem,
    CostingHeader,
    CostingTotals,
    Quotation,
    QuotationContact,
    QuotationMeta,
    QuotationItem,
    UploadedTemplate,
    BOQMatch,
} from "@/lib/types";
import {
    recalcItem,
    calcTotals,
    createCostingItem,
    formatPercent,
    DEFAULT_CURRENCY,
    DEFAULT_GST_RATE,
} from "@/lib/calculations";
import { nanoid, formatDate, generateQuotationNumber } from "@/lib/utils";
import seedCatalog from "@/lib/data/seedCatalog.json";

// ─── Default Values ───────────────────────────────────────────────────────────

const defaultTotals: CostingTotals = {
    subtotalCost: 0,
    subtotalSelling: 0,
    gstAmount: 0,
    grandTotal: 0,
    totalItems: 0,
    totalQty: 0,
    averageMargin: 0,
};

const defaultHeader: CostingHeader = {
    customerName: "",
    company: "",
    project: "",
    reference: "",
    date: formatDate(),
    currency: DEFAULT_CURRENCY,
    gstRate: DEFAULT_GST_RATE,
    notes: "",
};

export const DEFAULT_BRANDS = [
    "Chint",
    "Schneider Electric",
    "ABB",
    "Siemens",
    "Terasaki",
    "LS Electric",
    "Hager",
    "Legrand",
];

// ─── Store Interface ──────────────────────────────────────────────────────────

interface EmsStore extends AppState {
    // Brand actions
    addBrand: (brand: string) => boolean;
    removeBrand: (brand: string) => void;
    resetBrands: () => void;

    // Price list actions
    addPriceList: (meta: PriceListMeta) => void;
    updatePriceList: (id: string, updates: Partial<PriceListMeta>) => void;
    removePriceList: (id: string) => void;
    clearPriceLists: () => void;

    // Product index actions
    addProducts: (products: Product[]) => void;
    removeProduct: (productId: string) => void;
    removeProductsByBrand: (brand: string) => void;
    removeProductsByPriceList: (priceListId: string) => void;
    clearProducts: () => void;
    getProducts: () => Product[];

    // Costing actions
    initSession: (header?: Partial<CostingHeader>) => void;
    updateHeader: (updates: Partial<CostingHeader>) => void;
    addItemToCosting: (product: Product, overrides?: Partial<CostingItem>) => void;
    removeItemFromCosting: (id: string) => void;
    updateCostingItem: (id: string, updates: Partial<CostingItem>) => void;
    clearSession: () => void;

    // Quotation actions
    createQuotation: (contact: QuotationContact, meta: Partial<QuotationMeta>) => void;
    updateQuotation: (updates: Partial<Quotation>) => void;
    clearQuotation: () => void;

    // Template actions
    setCostingTemplate: (template: UploadedTemplate) => void;
    setQuotationTemplate: (template: UploadedTemplate) => void;
    clearTemplate: (type: "costing" | "quotation") => void;

    // BOQ actions
    setBoqMatches: (matches: BOQMatch[]) => void;
    updateBoqMatch: (boqItemId: string, updates: Partial<BOQMatch>) => void;
    clearBoqMatches: () => void;
}

// ─── Helper: recompute totals from items + gstRate ────────────────────────────

function recomputeTotals(
    items: CostingItem[],
    gstRate: number
): CostingTotals {
    return calcTotals(items, gstRate);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEmsStore = create<EmsStore>()(
    persist(
        (set, get) => ({
            // ── Initial State ──
            brands: DEFAULT_BRANDS,
            priceLists: [],
            products: (seedCatalog as Product[]) || [],
            costingSession: null,
            quotation: null,
            costingTemplate: null,
            quotationTemplate: null,
            boqMatches: [],

            // ── Brand Actions ──
            addBrand: (brand) => {
                const trimmed = brand.trim();
                if (!trimmed) return false;
                const current = get().brands || DEFAULT_BRANDS;
                if (current.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
                    return false;
                }
                set({ brands: [...current, trimmed] });
                return true;
            },

            removeBrand: (brand) => {
                const trimmed = brand.trim().toLowerCase();
                set((s) => {
                    const current = s.brands || DEFAULT_BRANDS;
                    const brandLists = s.priceLists.filter(
                        (pl) => pl.brand.toLowerCase() === trimmed
                    );
                    const listIdsToRemove = new Set(brandLists.map((pl) => pl.id));

                    return {
                        brands: current.filter((b) => b.toLowerCase() !== trimmed),
                        priceLists: s.priceLists.filter((pl) => !listIdsToRemove.has(pl.id)),
                        products: s.products.filter(
                            (p) =>
                                !listIdsToRemove.has(p.priceListId) &&
                                p.brand.toLowerCase() !== trimmed
                        ),
                    };
                });
            },

            resetBrands: () => set({ brands: DEFAULT_BRANDS }),

            // ── Price List Actions ──
            addPriceList: (meta) =>
                set((s) => ({
                    priceLists: [
                        ...s.priceLists.filter((p) => p.id !== meta.id),
                        meta,
                    ],
                })),

            updatePriceList: (id, updates) =>
                set((s) => ({
                    priceLists: s.priceLists.map((p) =>
                        p.id === id ? { ...p, ...updates } : p
                    ),
                })),

            removePriceList: (id) =>
                set((s) => ({
                    priceLists: s.priceLists.filter((p) => p.id !== id),
                })),

            clearPriceLists: () => set({ priceLists: [], products: [] }),

            // ── Product Index Actions ──
            addProducts: (products) =>
                set((s) => ({
                    products: [
                        ...s.products.filter(
                            (p) => p.priceListId !== products[0]?.priceListId
                        ),
                        ...products,
                    ],
                })),

            removeProduct: (productId) =>
                set((s) => ({
                    products: s.products.filter((p) => p.id !== productId),
                })),

            removeProductsByBrand: (brand) => {
                const target = brand.trim().toLowerCase();
                set((s) => ({
                    products: s.products.filter((p) => p.brand.toLowerCase() !== target),
                }));
            },

            removeProductsByPriceList: (plId) =>
                set((s) => ({
                    products: s.products.filter((p) => p.priceListId !== plId),
                })),

            clearProducts: () =>
                set((s) => ({
                    products: [],
                    priceLists: s.priceLists.map((pl) => ({ ...pl, productCount: 0 })),
                })),

            getProducts: () => get().products,

            // ── Costing Actions ──
            initSession: (header = {}) => {
                const id = nanoid();
                const now = new Date().toISOString();
                set({
                    costingSession: {
                        id,
                        header: { ...defaultHeader, ...header },
                        items: [],
                        totals: defaultTotals,
                        createdAt: now,
                        updatedAt: now,
                    },
                });
            },

            updateHeader: (updates) =>
                set((s) => {
                    if (!s.costingSession) return s;
                    const header = { ...s.costingSession.header, ...updates };
                    const totals = recomputeTotals(
                        s.costingSession.items,
                        header.gstRate
                    );
                    return {
                        costingSession: {
                            ...s.costingSession,
                            header,
                            totals,
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            addItemToCosting: (product, overrides) =>
                set((s) => {
                    if (!s.costingSession) {
                        // Auto-init if no session
                        const id = nanoid();
                        const now = new Date().toISOString();
                        const newItem = createCostingItem(product, { lineNo: 1, ...overrides });
                        const totals = recomputeTotals([newItem], defaultHeader.gstRate);
                        return {
                            costingSession: {
                                id,
                                header: defaultHeader,
                                items: [newItem],
                                totals,
                                createdAt: now,
                                updatedAt: now,
                            },
                        };
                    }
                    const lineNo = s.costingSession.items.length + 1;
                    const newItem = createCostingItem(product, { lineNo, ...overrides });
                    const items = [...s.costingSession.items, newItem];
                    const totals = recomputeTotals(
                        items,
                        s.costingSession.header.gstRate
                    );
                    return {
                        costingSession: {
                            ...s.costingSession,
                            items,
                            totals,
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            removeItemFromCosting: (id) =>
                set((s) => {
                    if (!s.costingSession) return s;
                    const items = s.costingSession.items.filter((i) => i.id !== id);
                    const totals = recomputeTotals(
                        items,
                        s.costingSession.header.gstRate
                    );
                    return {
                        costingSession: {
                            ...s.costingSession,
                            items,
                            totals,
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            updateCostingItem: (id, updates) =>
                set((s) => {
                    if (!s.costingSession) return s;
                    const items = s.costingSession.items.map((item) => {
                        if (item.id !== id) return item;
                        return recalcItem({ ...item, ...updates });
                    });
                    const totals = recomputeTotals(
                        items,
                        s.costingSession.header.gstRate
                    );
                    return {
                        costingSession: {
                            ...s.costingSession,
                            items,
                            totals,
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            clearSession: () =>
                set({ costingSession: null, quotation: null }),

            // ── Quotation Actions ──
            createQuotation: (contact, meta) => {
                const session = get().costingSession;
                const items: QuotationItem[] = (session?.items ?? []).map((i) => ({
                    id: i.id,
                    lineNo: i.lineNo,
                    description: i.customDescription || i.product.description,
                    brand: i.product.brand,
                    productCode: i.product.productCode,
                    qty: i.qty,
                    unitPrice: i.sellingPrice,
                    totalPrice: i.totalSelling,
                    unit: i.product.unit,
                }));
                const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
                const gstRate = session?.header.gstRate ?? DEFAULT_GST_RATE;
                const gstAmount = Math.round(subtotal * gstRate * 100) / 100;
                const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
                const now = new Date().toISOString();

                const quotation: Quotation = {
                    id: nanoid(),
                    contact,
                    meta: {
                        quotationNumber: generateQuotationNumber(),
                        date: formatDate(),
                        validUntil: formatDate(
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ),
                        project: session?.header.project ?? "",
                        reference: session?.header.reference ?? "",
                        paymentTerms: "30 days net",
                        deliveryTerms: "EXW",
                        notes: "",
                        termsAndConditions:
                            "All prices are subject to change without prior notice. Availability is subject to stock at time of order.",
                        ...meta,
                    },
                    items,
                    subtotal,
                    gstRate,
                    gstAmount,
                    grandTotal,
                    currency: session?.header.currency ?? DEFAULT_CURRENCY,
                    createdAt: now,
                };
                set({ quotation });
            },

            updateQuotation: (updates) =>
                set((s) => ({
                    quotation: s.quotation ? { ...s.quotation, ...updates } : null,
                })),

            clearQuotation: () => set({ quotation: null }),

            // ── Template Actions ──
            setCostingTemplate: (template) => set({ costingTemplate: template }),
            setQuotationTemplate: (template) => set({ quotationTemplate: template }),
            clearTemplate: (type) =>
                set(type === "costing" ? { costingTemplate: null } : { quotationTemplate: null }),

            // ── BOQ Actions ──
            setBoqMatches: (matches) => set({ boqMatches: matches }),
            updateBoqMatch: (boqItemId, updates) =>
                set((s) => ({
                    boqMatches: s.boqMatches.map((m) =>
                        m.boqItem.id === boqItemId ? { ...m, ...updates } : m
                    ),
                })),
            clearBoqMatches: () => set({ boqMatches: [] }),
        }),
        {
            name: "ems-app-store",
            storage: createJSONStorage(() => indexedDbStorage),
            partialize: (s) => ({
                brands: s.brands || DEFAULT_BRANDS,
                priceLists: s.priceLists.map((pl) => ({
                    id: pl.id,
                    brand: pl.brand,
                    fileName: pl.fileName,
                    currency: pl.currency,
                    uploadDate: pl.uploadDate,
                    status: pl.status,
                    productCount: pl.productCount,
                    errorMessage: pl.errorMessage,
                })),
                costingSession: s.costingSession,
                quotation: s.quotation,
                costingTemplate: s.costingTemplate
                    ? { ...s.costingTemplate, rawFile: undefined }
                    : null,
                quotationTemplate: s.quotationTemplate
                    ? { ...s.quotationTemplate, rawFile: undefined }
                    : null,
                boqMatches: s.boqMatches,
            }),
            onRehydrateStorage: () => (state) => {
                if (state && (!state.products || state.products.length === 0)) {
                    state.products = seedCatalog as Product[];
                }
            },
        }
    )
);

/**
 * Hook to track whether Zustand async store hydration from IndexedDB has completed.
 * Prevents premature session creation or UI flickers while loading from IndexedDB.
 */
export function useHasHydrated(): boolean {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const unsub = useEmsStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });
        if (useEmsStore.persist.hasHydrated()) {
            setHydrated(true);
        }
        return () => {
            unsub();
        };
    }, []);

    return hydrated;
}

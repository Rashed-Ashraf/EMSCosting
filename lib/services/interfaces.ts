// =============================================================================
// ELECTRICAL MASTER — Service Interfaces (Database-Ready Architecture)
// =============================================================================
// These interfaces define the contract between the UI/business logic and the
// data layer. The MVP uses in-memory implementations. Future versions can
// swap in Supabase/PostgreSQL implementations without changing the frontend.

import type {
    Product,
    PriceListMeta,
    CostingSession,
    CostingItem,
    CostingHeader,
    Quotation,
    QuotationContact,
    QuotationMeta,
    UploadedTemplate,
    SearchResult,
    BOQMatch,
    BOQItem,
} from "../types";

// ─── Product Service ──────────────────────────────────────────────────────────

export interface IProductService {
    /** Add products to the index */
    addProducts(products: Product[]): void;
    /** Remove all products for a given price list */
    removeByPriceList(priceListId: string): void;
    /** Clear entire index */
    clear(): void;
    /** Get all products */
    getAll(): Product[];
    /** Get product count */
    count(): number;
    /** Search products */
    search(query: string, limit?: number): SearchResult[];
    /** Get product by exact code */
    getByCode(code: string): Product | null;
    /** Get products by brand */
    getByBrand(brand: string): Product[];
}

// ─── Price List Service ───────────────────────────────────────────────────────

export interface IPriceListService {
    /** Register a price list (metadata only) */
    register(meta: PriceListMeta): void;
    /** Update existing price list metadata */
    update(id: string, updates: Partial<PriceListMeta>): void;
    /** Get all registered price lists */
    getAll(): PriceListMeta[];
    /** Get by brand name */
    getByBrand(brand: string): PriceListMeta | null;
    /** Remove a price list */
    remove(id: string): void;
    /** Clear all */
    clear(): void;
}

// ─── Costing Service ─────────────────────────────────────────────────────────

export interface ICostingService {
    /** Create or replace the current session */
    createSession(header: CostingHeader): CostingSession;
    /** Get current session */
    getSession(): CostingSession | null;
    /** Update session header */
    updateHeader(updates: Partial<CostingHeader>): void;
    /** Add an item */
    addItem(item: CostingItem): void;
    /** Remove an item */
    removeItem(id: string): void;
    /** Update an item */
    updateItem(id: string, updates: Partial<CostingItem>): void;
    /** Clear all items */
    clearItems(): void;
    /** Clear the entire session */
    clearSession(): void;
}

// ─── Quotation Service ────────────────────────────────────────────────────────

export interface IQuotationService {
    /** Create a new quotation from current costing session */
    create(contact: QuotationContact, meta: QuotationMeta): Quotation;
    /** Get current quotation */
    get(): Quotation | null;
    /** Update */
    update(updates: Partial<Quotation>): void;
    /** Clear */
    clear(): void;
}

// ─── Template Service ─────────────────────────────────────────────────────────

export interface ITemplateService {
    /** Save a template */
    save(template: UploadedTemplate): void;
    /** Get costing template */
    getCostingTemplate(): UploadedTemplate | null;
    /** Get quotation template */
    getQuotationTemplate(): UploadedTemplate | null;
    /** Clear a template */
    clear(type: "costing" | "quotation"): void;
}

// ─── BOQ Service ─────────────────────────────────────────────────────────────

export interface IBOQService {
    /** Save BOQ matches */
    setMatches(matches: BOQMatch[]): void;
    /** Get all matches */
    getMatches(): BOQMatch[];
    /** Update a single match */
    updateMatch(boqItemId: string, updates: Partial<BOQMatch>): void;
    /** Clear */
    clear(): void;
    /** Get accepted items */
    getAccepted(): BOQItem[];
}

// =============================================================================
// ELECTRICAL MASTER — Shared TypeScript Types
// =============================================================================

// ─── Price List ───────────────────────────────────────────────────────────────

export type FileStatus = "uploading" | "processing" | "ready" | "error";

export interface PriceListMeta {
    id: string;
    brand: string;
    fileName: string;
    version?: string;
    currency: string;
    effectiveDate?: string;
    uploadDate: string;
    status: FileStatus;
    productCount: number;
    errorMessage?: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
    id: string;
    productCode: string;
    sku?: string;
    manufacturerPartNo?: string;
    brand: string;
    productName: string;
    description: string;
    specifications?: Record<string, string>;
    listPrice: number;
    discount: number; // as decimal e.g. 0.35
    netCost: number;
    currency: string;
    priceListId: string;
    priceListVersion?: string;
    category?: string;
    unit?: string;
}

// ─── Column Mapping ───────────────────────────────────────────────────────────

export type StandardField =
    | "product_code"
    | "sku"
    | "manufacturer_part_no"
    | "brand"
    | "product_name"
    | "description"
    | "list_price"
    | "discount"
    | "currency"
    | "category"
    | "unit"
    | "ignore";

export interface ColumnMapping {
    originalHeader: string;
    mappedTo: StandardField;
    confidence: number; // 0-1
    aiSuggested: boolean;
}

export interface ImportPreview {
    priceListId: string;
    fileName: string;
    fileType?: "spreadsheet" | "pdf" | "image";
    sheets: string[];
    selectedSheet: string;
    headers: string[];
    mappings: ColumnMapping[];
    previewRows: Record<string, string>[];
    totalRows: number;
}

// ─── Costing ──────────────────────────────────────────────────────────────────

export interface CostingHeader {
    customerName: string;
    company: string;
    project: string;
    reference: string;
    date: string;
    currency: string;
    gstRate: number; // e.g. 0.1 for 10%
    notes?: string;
}

export interface CostingItem {
    id: string;
    lineNo: number;
    product: Product;
    qty: number;
    listPrice: number;
    discount: number; // decimal
    netCost: number;
    margin: number; // decimal
    sellingPrice: number;
    totalCost: number;
    totalSelling: number;
    customDescription?: string;
}

export interface CostingTotals {
    subtotalCost: number;
    subtotalSelling: number;
    gstAmount: number;
    grandTotal: number;
    totalItems: number;
    totalQty: number;
    averageMargin: number;
}

export interface CostingSession {
    id: string;
    header: CostingHeader;
    items: CostingItem[];
    totals: CostingTotals;
    createdAt: string;
    updatedAt: string;
}

// ─── BOQ ──────────────────────────────────────────────────────────────────────

export interface BOQItem {
    id: string;
    lineNo: number;
    description: string;
    qty: number;
    unit?: string;
    notes?: string;
    brand?: string;
    model?: string;
    unitPrice?: number;
    totalPrice?: number;
    currency?: string;
    category?: string;
}

export interface BOQMatch {
    boqItem: BOQItem;
    suggestedProduct: Product | null;
    confidence: number; // 0-1
    alternatives: Product[];
    status: "pending" | "accepted" | "rejected" | "manual";
}

// ─── Quotation ────────────────────────────────────────────────────────────────

export interface QuotationContact {
    customerName: string;
    company: string;
    address: string;
    phone: string;
    email: string;
}

export interface QuotationMeta {
    quotationNumber: string;
    date: string;
    validUntil: string;
    project: string;
    reference: string;
    paymentTerms: string;
    deliveryTerms: string;
    notes: string;
    termsAndConditions: string;
}

export interface QuotationItem {
    id: string;
    lineNo: number;
    description: string;
    brand: string;
    productCode: string;
    qty: number;
    unitPrice: number; // selling price
    totalPrice: number;
    unit?: string;
}

export interface Quotation {
    id: string;
    contact: QuotationContact;
    meta: QuotationMeta;
    items: QuotationItem[];
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    grandTotal: number;
    currency: string;
    createdAt: string;
}

// ─── Template ─────────────────────────────────────────────────────────────────

export type TemplateType = "costing" | "quotation";

export interface TemplateColumnMapping {
    excelColumn: string; // e.g. "B", "C"
    excelHeader: string; // e.g. "UNIT PRICE"
    mappedTo: string; // e.g. "list_price"
    confidence: number;
}

export interface UploadedTemplate {
    id: string;
    type: TemplateType;
    fileName: string;
    uploadDate: string;
    sheets: string[];
    columnMappings: TemplateColumnMapping[];
    headerRow: number;
    dataStartRow: number;
    status: "pending_mapping" | "mapped" | "ready";
    rawFile?: File; // browser-side only
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
    product: Product;
    score: number; // 0-1, 1 = perfect match
    matchType: "exact" | "partial" | "fuzzy" | "ai";
}

// ─── App State (used by Zustand store) ────────────────────────────────────────

export interface AppState {
    brands: string[];
    priceLists: PriceListMeta[];
    products: Product[]; // flat product index
    costingSession: CostingSession | null;
    quotation: Quotation | null;
    costingTemplate: UploadedTemplate | null;
    quotationTemplate: UploadedTemplate | null;
    boqMatches: BOQMatch[];
}

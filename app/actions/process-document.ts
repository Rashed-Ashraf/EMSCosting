"use server";

// =============================================================================
// ELECTRICAL MASTER — Server Actions: Document Processing Engine
// Isolates heavy binary parsers (exceljs, pdf-parse, tesseract.js) strictly
// on the server side to maintain minimal client bundle size.
// =============================================================================

import { processPriceListDocument } from "@/lib/parsers/priceListParser";
import { processRequirementDocument } from "@/lib/parsers/requirementParser";
import { nanoid, parsePrice, parsePercent } from "@/lib/utils";
import { calcNetCost } from "@/lib/calculations";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Product, StandardField, ColumnMapping, BOQItem } from "@/lib/types";

export type ProcessDocumentType = "price-list" | "boq" | "requirement" | "auto";

export type ProcessDocumentResult =
    | {
          success: true;
          documentType: "price-list";
          data: {
              priceListId: string;
              fileName: string;
              brand: string;
              sheets: string[];
              selectedSheet: string;
              headers: string[];
              mappings: ColumnMapping[];
              previewRows: Record<string, string>[];
              totalRows: number;
              fileType: string;
              extractionMethod: string;
              products: Product[];
              processedCount: number;
          };
      }
    | {
          success: true;
          documentType: "boq";
          data: {
              fileName: string;
              fileType: string;
              items: BOQItem[];
              totalItems: number;
              extractionMethod?: string;
          };
      }
    | {
          success: false;
          error: string;
      };

const ALLOWED_EXTENSIONS = [
    "xlsx",
    "xls",
    "csv",
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "bmp",
    "tiff",
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

/**
 * Universal Server Action for document processing.
 * Accepts a multipart FormData payload, performs parsing on the Node server,
 * and streams back clean, serialized JSON objects.
 */
export async function processDocumentAction(
    formData: FormData
): Promise<ProcessDocumentResult> {
    try {
        const file = formData.get("file") as File | null;
        if (!file) {
            return { success: false, error: "No file was uploaded." };
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                success: false,
                error: `File exceeds maximum allowed size of 50MB (received ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
            };
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
            return {
                success: false,
                error: `Unsupported file format (.${ext}). Supported formats: Excel (.xlsx, .xls), CSV, PDF (.pdf), and Images (.png, .jpg, .webp).`,
            };
        }

        const rawDocType = (formData.get("documentType") as string) || "auto";
        const brand = ((formData.get("brand") as string) || "").trim();
        const sheetName = ((formData.get("sheet") as string) || "").trim();

        // Determine target parsing pipeline
        const isBoqOrRequirement =
            rawDocType === "boq" ||
            rawDocType === "requirement" ||
            (rawDocType === "auto" && !brand && /boq|requirement|quote|inquiry|tender|rfq/i.test(file.name));

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (isBoqOrRequirement) {
            const result = await processRequirementDocument(buffer, file.name);
            return {
                success: true,
                documentType: "boq",
                data: result,
            };
        }

        // Process as Price List Catalog
        const result = await processPriceListDocument(buffer, file.name, brand, sheetName);

        // Pre-map preview products using heuristic standard mappings
        const fieldMap: Record<string, StandardField> = {};
        for (const m of result.mappings) {
            if (m.mappedTo !== "ignore") {
                fieldMap[m.originalHeader] = m.mappedTo;
            }
        }

        const autoProducts: Product[] = [];
        for (let i = 0; i < result.previewRows.length; i++) {
            const row = result.previewRows[i];
            const getValue = (field: StandardField): string => {
                const header = Object.keys(fieldMap).find((h) => fieldMap[h] === field);
                return header ? (row[header] || "").trim() : "";
            };

            const productCode = getValue("product_code");
            const description = getValue("description");
            const rawPrice = getValue("list_price");
            const listPrice = parsePrice(rawPrice);

            if (!productCode && !description) continue;
            if (listPrice === 0 && !rawPrice) continue;

            const rawDiscount = getValue("discount");
            const discount = rawDiscount ? parsePercent(rawDiscount) : 0;
            const netCost = calcNetCost(listPrice, discount);
            const detectedBrand = getValue("brand") || brand || "Electrical Master";

            autoProducts.push({
                id: `${result.priceListId}_${nanoid(8)}`,
                productCode: productCode || `ITEM-${i + 1}`,
                sku: productCode || undefined,
                brand: detectedBrand,
                productName: description || productCode,
                description: description || productCode,
                listPrice,
                discount,
                netCost,
                currency: DEFAULT_CURRENCY,
                priceListId: result.priceListId,
                category: getValue("category") || undefined,
                unit: getValue("unit") || undefined,
            });
        }

        return {
            success: true,
            documentType: "price-list",
            data: {
                ...result,
                brand: brand || "Electrical Master",
                fileType: result.fileType || "spreadsheet",
                extractionMethod: result.extractionMethod || "standard",
                products: autoProducts,
                processedCount: autoProducts.length,
            },
        };
    } catch (err: unknown) {
        console.error("processDocumentAction server error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to parse document on server.";
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Dedicated server action for processing Price Lists.
 */
export async function processPriceListAction(
    formData: FormData
): Promise<ProcessDocumentResult> {
    formData.set("documentType", "price-list");
    return processDocumentAction(formData);
}

/**
 * Dedicated server action for processing BOQ / Requirement files.
 */
export async function processRequirementAction(
    formData: FormData
): Promise<ProcessDocumentResult> {
    formData.set("documentType", "boq");
    return processDocumentAction(formData);
}

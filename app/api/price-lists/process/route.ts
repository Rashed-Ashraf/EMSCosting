// =============================================================================
// API: Process Price List File
// POST /api/price-lists/process
// Supports: XLSX, XLS, CSV, PDF, and Images (PNG, JPG, JPEG, WEBP)
// Returns: { sheets, selectedSheet, headers, mappings, previewRows, totalRows, fileType, extractionMethod }
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { processPriceListDocument } from "@/lib/parsers/priceListParser";
import { nanoid, parsePrice, parsePercent } from "@/lib/utils";
import { calcNetCost } from "@/lib/calculations";
import type { Product, StandardField } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const brand = (formData.get("brand") as string) || "";
        const sheetName = (formData.get("sheet") as string) || "";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg", "webp", "bmp", "tiff"];

        if (!allowedExtensions.includes(ext || "")) {
            return NextResponse.json(
                {
                    error: `Unsupported file format (.${ext}). Supported formats: Excel (XLSX, XLS), CSV, PDF, and Images (PNG, JPG, WEBP).`,
                },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await processPriceListDocument(buffer, file.name, brand, sheetName);

        // Pre-build products using initial mappings for immediate indexing
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
            const detectedBrand = getValue("brand") || brand;

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
                currency: "PKR",
                priceListId: result.priceListId,
                category: getValue("category") || undefined,
                unit: getValue("unit") || undefined,
            });
        }

        return NextResponse.json({
            ...result,
            products: autoProducts,
            processedCount: autoProducts.length,
        });
    } catch (err: unknown) {
        console.error("Price list process error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to process file.";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

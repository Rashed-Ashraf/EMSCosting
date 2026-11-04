// =============================================================================
// API: Confirm Price List Import — Build Product Array
// POST /api/price-lists/confirm
// Accepts: { rows, mappings, brand, priceListId, currency, priceListVersion }
// Returns: { products[] }
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { nanoid, parsePrice, parsePercent } from "@/lib/utils";
import { calcNetCost } from "@/lib/calculations";
import type { Product, ColumnMapping, StandardField } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            rows,
            mappings,
            brand,
            priceListId,
            currency = "AUD",
            priceListVersion,
        } = body as {
            rows: Record<string, string>[];
            mappings: ColumnMapping[];
            brand: string;
            priceListId: string;
            currency: string;
            priceListVersion?: string;
        };

        if (!rows || !mappings) {
            return NextResponse.json({ error: "Missing rows or mappings" }, { status: 400 });
        }

        // Build a column → field lookup
        const fieldMap: Record<string, StandardField> = {};
        for (const m of mappings) {
            if (m.mappedTo !== "ignore") {
                fieldMap[m.originalHeader] = m.mappedTo;
            }
        }

        const products: Product[] = [];
        const skippedRows: number[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Gather values by standard field
            const getValue = (field: StandardField): string => {
                const header = Object.keys(fieldMap).find((h) => fieldMap[h] === field);
                return header ? (row[header] || "").trim() : "";
            };

            const productCode = getValue("product_code");
            const description = getValue("description");
            const rawPrice = getValue("list_price");
            const listPrice = parsePrice(rawPrice);

            // Skip rows with no product code or price
            if (!productCode && !description) {
                skippedRows.push(i + 1);
                continue;
            }
            if (listPrice === 0 && !rawPrice) {
                skippedRows.push(i + 1);
                continue;
            }

            const rawDiscount = getValue("discount");
            const discount = rawDiscount ? parsePercent(rawDiscount) : 0;
            const netCost = calcNetCost(listPrice, discount);
            const detectedBrand = getValue("brand") || brand;
            const productName = description || productCode;

            products.push({
                id: `${priceListId}_${nanoid(8)}`,
                productCode: productCode || `ITEM-${i + 1}`,
                sku: productCode || undefined,
                brand: detectedBrand,
                productName,
                description,
                listPrice,
                discount,
                netCost,
                currency,
                priceListId,
                priceListVersion,
                category: getValue("category") || undefined,
                unit: getValue("unit") || undefined,
            });
        }

        return NextResponse.json({
            products,
            processedCount: products.length,
            skippedCount: skippedRows.length,
            skippedRows: skippedRows.slice(0, 50),
        });
    } catch (err) {
        console.error("Confirm import error:", err);
        return NextResponse.json({ error: "Failed to process import." }, { status: 500 });
    }
}

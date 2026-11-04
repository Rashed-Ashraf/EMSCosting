// =============================================================================
// API: AI Column Mapping
// POST /api/ai/map-columns
// Uses OpenAI to suggest mappings for ambiguous column headers
// IMPORTANT: API key is server-side only — never exposed to the browser
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ColumnMapping, StandardField } from "@/lib/types";

// OpenAI client will be initialized dynamically in the handler

const STANDARD_FIELDS: StandardField[] = [
    "product_code",
    "sku",
    "manufacturer_part_no",
    "brand",
    "product_name",
    "description",
    "list_price",
    "discount",
    "currency",
    "category",
    "unit",
    "ignore",
];

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "OpenAI API key not configured. Set OPENAI_API_KEY in .env.local" },
                { status: 503 }
            );
        }
        const openai = new OpenAI({ apiKey });

        const { columnHeaders } = await req.json() as { columnHeaders: string[] };

        if (!columnHeaders || columnHeaders.length === 0) {
            return NextResponse.json({ error: "No column headers provided" }, { status: 400 });
        }

        const prompt = `You are an expert at mapping spreadsheet column headers to standard electrical product price list fields.

Given the following column headers from an uploaded price list file, map each one to the most appropriate standard field.

Available standard fields:
- product_code: product code, SKU, part number, item code, reference
- sku: SKU, stock keeping unit
- manufacturer_part_no: manufacturer part number, MPN
- brand: brand name, manufacturer name, make
- product_name: product name, item name
- description: product description, item description
- list_price: list price, RRP, unit price, sell price, catalog price
- discount: discount percentage, trade discount
- currency: currency code (AUD, USD, EUR, etc.)
- category: product category, product group, product type
- unit: unit of measure (each, m, set, lot, etc.)
- ignore: irrelevant column (row numbers, internal codes, etc.)

Column headers to map:
${columnHeaders.map((h, i) => `${i + 1}. "${h}"`).join("\n")}

Respond with ONLY a valid JSON array with this exact structure, one object per header:
[
  { "originalHeader": "...", "mappedTo": "field_name", "confidence": 0.95 }
]

The confidence should be between 0 and 1.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content || "{}";

        let parsed: { mappings?: ColumnMapping[] } | ColumnMapping[];
        try {
            parsed = JSON.parse(raw);
        } catch {
            return NextResponse.json({ error: "AI returned invalid response." }, { status: 500 });
        }

        // Handle both array and wrapped object responses
        let mappings: ColumnMapping[] = [];
        if (Array.isArray(parsed)) {
            mappings = parsed;
        } else if (parsed && typeof parsed === "object" && "mappings" in parsed && Array.isArray((parsed as { mappings: ColumnMapping[] }).mappings)) {
            mappings = (parsed as { mappings: ColumnMapping[] }).mappings;
        } else {
            // Try to find array in the object
            const values = Object.values(parsed as object);
            const arr = values.find(Array.isArray);
            mappings = arr ?? [];
        }

        // Validate fields
        const validMappings: ColumnMapping[] = mappings.map((m: ColumnMapping) => ({
            originalHeader: m.originalHeader || "",
            mappedTo: STANDARD_FIELDS.includes(m.mappedTo as StandardField) ? m.mappedTo : "ignore",
            confidence: typeof m.confidence === "number" ? m.confidence : 0.7,
            aiSuggested: true,
        }));

        return NextResponse.json({ mappings: validMappings });
    } catch (err) {
        console.error("AI column mapping error:", err);
        return NextResponse.json(
            { error: "AI mapping failed. You can map columns manually." },
            { status: 500 }
        );
    }
}

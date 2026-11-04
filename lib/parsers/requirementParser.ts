// =============================================================================
// ELECTRICAL MASTER — Universal Requirement & BOQ Parser
// Supports: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Images (.png, .jpg, .webp)
// Supports both AI (OpenAI Vision & Text) and Local/Offline (pdf-parse & Tesseract OCR)
// =============================================================================

import ExcelJS from "exceljs";
import OpenAI from "openai";
import { parsePrice, nanoid } from "../utils";
import type { BOQItem } from "../types";

/**
 * Heuristically parses unstructured plain text into BOQ items
 */
export function parseTextToRequirementItems(text: string): BOQItem[] {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const items: BOQItem[] = [];
    const skipRegex = /^(page\s+\d+|--\s*\d+\s*of\s*\d+\s*--|total|subtotal|terms|validity|date|quotation|invoice|tax\s+invoice|client|project|reference)/i;

    const unitRegex = /\b(EA|EACH|NOS|NO|PCS|PC|SET|LOT|M|MTR|METRE|ROLL|BOX|PACK|PAIR)\b/i;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.length < 3 || skipRegex.test(line)) continue;

        // Skip exact table header rows
        if (
            (line.toLowerCase().includes("item") || line.toLowerCase().includes("s.no") || line.toLowerCase().includes("#")) &&
            (line.toLowerCase().includes("desc") || line.toLowerCase().includes("specification") || line.toLowerCase().includes("particular")) &&
            (line.toLowerCase().includes("qty") || line.toLowerCase().includes("quantity"))
        ) {
            continue;
        }

        // 1. Delimited line check (pipe or tab or multiple spaces)
        let tokens: string[] = [];
        if (line.includes("|")) {
            tokens = line.split("|").map((t) => t.trim()).filter(Boolean);
        } else if (line.includes("\t")) {
            tokens = line.split("\t").map((t) => t.trim()).filter(Boolean);
        } else if (/\s{2,}/.test(line)) {
            tokens = line.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean);
        }

        if (tokens.length >= 2) {
            // Find numeric quantity token
            let qtyVal = 1;
            let unitVal = "EA";
            let descVal = "";
            let foundQty = false;

            // Check from right to left for qty
            for (let i = tokens.length - 1; i >= 0; i--) {
                const t = tokens[i].trim();
                if (!foundQty) {
                    const matchQty = t.match(/^(?:qty[:=\s]*)?(\d+(?:\.\d+)?)\s*(ea|each|nos|no|pcs|pc|set|lot|m)?$/i);
                    if (matchQty) {
                        qtyVal = parseFloat(matchQty[1]);
                        if (matchQty[2]) unitVal = matchQty[2].toUpperCase();
                        foundQty = true;
                        continue;
                    }
                }
                if (unitRegex.test(t) && t.length <= 6) {
                    unitVal = t.toUpperCase();
                    continue;
                }
            }

            // Description is remaining tokens (ignoring purely numeric index if at start)
            const remaining = tokens.filter((t) => {
                const isQty = t === String(qtyVal) || t.toLowerCase().includes(`qty`);
                return !isQty;
            });

            if (remaining.length > 0) {
                // If first token is just a line number (e.g. "1" or "1."), drop it from description
                if (/^\d+[\.\)]?$/.test(remaining[0]) && remaining.length > 1) {
                    descVal = remaining.slice(1).join(" ");
                } else {
                    descVal = remaining.join(" ");
                }
            }

            if (descVal.length >= 3) {
                items.push({
                    id: nanoid(),
                    lineNo: items.length + 1,
                    description: descVal,
                    qty: qtyVal || 1,
                    unit: unitVal,
                });
                continue;
            }
        }

        // 2. Unstructured line regex: e.g. "1. 40A 3P MCB Schneider - 10 Nos" or "100A MCCB ABB Qty: 4"
        const qtyPattern = /(?:qty[:=\s]*|-|\bx\s*)(\d+(?:\.\d+)?)\s*(ea|each|nos|no|pcs|pc|set|lot|m)?\b/i;
        const match = line.match(qtyPattern);

        if (match && match.index !== undefined) {
            const rawDesc = line.substring(0, match.index).replace(/^\d+[\.\)]\s*/, "").replace(/[-–—:]\s*$/, "").trim();
            const qtyNum = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase() || "EA";

            if (rawDesc.length >= 3) {
                items.push({
                    id: nanoid(),
                    lineNo: items.length + 1,
                    description: rawDesc,
                    qty: qtyNum || 1,
                    unit,
                });
                continue;
            }
        }

        // 3. Fallback: line has electrical terms (e.g. "40A 3P MCB Schneider Electric")
        const hasElectricalRating = /\b\d+\s*(?:a|amp|amps|ka|kw|hp|v|pole|poles|1p|2p|3p|4p|mcb|mccb|acb)\b/i.test(line);
        if (hasElectricalRating) {
            const cleanLine = line.replace(/^\d+[\.\)]\s*/, "").trim();
            items.push({
                id: nanoid(),
                lineNo: items.length + 1,
                description: cleanLine,
                qty: 1,
                unit: "EA",
            });
        }
    }

    return items;
}

/**
 * Validates whether a string looks like a legitimate brand name.
 * Rejects pure numbers (e.g. "150", "500", "06"), ratings ("150 Amps", "500V"),
 * units ("EA", "PCS"), or generic status tokens.
 */
export function isValidBrandName(brand?: string | null): boolean {
    if (!brand) return false;
    const clean = brand.trim();
    if (clean.length < 2) return false;
    // Pure numeric string (e.g. "150", "500", "220", "06")
    if (/^\d+(\.\d+)?$/.test(clean)) return false;
    // Starts with number and ends with electrical unit (e.g. "150A", "150 Amps", "500V", "500 Volts", "36kA", "3P")
    if (/^\d+(\.\d+)?\s*(?:a|amp|amps|amperes|v|volt|volts|vac|vdc|ka|kw|hp|hz|p|pole|poles|kva|kvar)\b/i.test(clean)) return false;
    // Ratio like "150/5", "150 / 05"
    if (/^\d+\s*[\/:]\s*\d+/.test(clean)) return false;
    // Common unit or noise tokens
    if (/^(?:pcs|pc|nos|no|set|ea|each|lot|meter|m|pack|box|n\/?a|nil|null|none|-|--)$/i.test(clean)) return false;
    // Pure component type abbreviations
    if (/^(?:mcb|mccb|acb|rccb|rcbo|mpcb|spd|vfd|ct|pt|fuse|tor)$/i.test(clean)) return false;
    return true;
}

/**
 * Parse Excel (.xlsx, .xls) or CSV requirement file
 */
export async function parseSpreadsheetRequirements(
    buffer: Buffer,
    ext: string,
    fileName?: string
): Promise<BOQItem[]> {
    const workbook = new ExcelJS.Workbook();

    if (ext === "csv") {
        const text = new TextDecoder("utf-8").decode(buffer);
        const csvRows = text.split("\n").map((l) =>
            l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        );
        const ws = workbook.addWorksheet("Sheet1");
        for (const row of csvRows) ws.addRow(row);
    } else {
        // @ts-expect-error TypeScript Buffer alias mismatch with ExcelJS
        await workbook.xlsx.load(buffer);
    }

    // Pick first worksheet with meaningful row count
    let ws = workbook.worksheets[0];
    for (const sheet of workbook.worksheets) {
        if (sheet.rowCount > 2) {
            ws = sheet;
            break;
        }
    }
    if (!ws) throw new Error("No sheet found in file.");

    // Find header row by scoring rows against common column keywords.
    // Retain exact 1-based colNumber for each cell to prevent column shifting.
    let headerRowIndex = 1;
    let headerColMap = new Map<number, string>();
    let maxHeaderScore = -1;

    const HEADER_KEYWORDS = [
        "brand", "make", "manufacturer", "mfr", "vendor",
        "desc", "description", "specification", "particular", "item", "product",
        "model", "part no", "partno", "cat no", "catalogue no", "type", "item code",
        "rating", "ratings", "range", "capacity", "amp", "amps", "amperage",
        "qty", "quantity", "qnty", "count", "nos",
        "unit", "uom",
        "price", "rate", "cost", "amount", "total",
        "s.no", "sr.no", "sl.no", "serial", "#"
    ];

    for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const currentMap = new Map<number, string>();
        let score = 0;

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const v = String(cell.value || "").trim();
            if (v) {
                currentMap.set(colNumber, v);
                const lower = v.toLowerCase();
                for (const kw of HEADER_KEYWORDS) {
                    if (lower === kw || lower.includes(kw)) {
                        score += (lower === kw ? 3 : 1);
                        break;
                    }
                }
            }
        });

        if (currentMap.size >= 2 && score > maxHeaderScore) {
            maxHeaderScore = score;
            headerRowIndex = r;
            headerColMap = currentMap;
        }
    }

    if (headerColMap.size === 0) {
        const row = ws.getRow(1);
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const v = String(cell.value || "").trim();
            if (v) headerColMap.set(colNumber, v);
        });
        headerRowIndex = 1;
    }

    // Identify column roles using their exact 1-based colNumber
    let brandColNum = -1;
    let modelColNum = -1;
    let brandModelColNum = -1;
    let ratingSpecColNum = -1;
    let descColNum = -1;
    let categoryColNum = -1;
    let qtyColNum = -1;
    let unitColNum = -1;
    let unitPriceColNum = -1;
    let totalPriceColNum = -1;

    headerColMap.forEach((rawHeader, colNum) => {
        const h = rawHeader.toLowerCase().trim();

        // Serial numbers - skip
        if (/^(s\.?\s*no|sr\.?\s*no|sl\.?\s*no|serial|sno|#)$/i.test(h)) return;

        // Dedicated Brand column: e.g. "BRAND", "MAKE", "MANUFACTURER", "MFR", "VENDOR"
        if (brandColNum < 0 && /^(brand|make|manufacturer|mfr|vendor|supplier)$/i.test(h)) {
            brandColNum = colNum;
            return;
        }

        // Dedicated Model column: e.g. "MODEL", "MODEL NO", "PART NO", "CAT NO", "CATALOGUE NO", "TYPE"
        if (modelColNum < 0 && /^(model|model\s*no|model\s*number|part\s*no|part\s*number|partno|cat\s*no|catalogue\s*no|catalog\s*no|item\s*code|type)$/i.test(h)) {
            modelColNum = colNum;
            return;
        }

        // Dedicated Rating / Specification column: e.g. "RATING", "RATINGS", "SPECIFICATION", "SPECS", "RANGE", "CAPACITY", "RATING / SPECIFICATION"
        if (ratingSpecColNum < 0 && (
            /^(rating|ratings|range|capacity|parameters|specification|specifications|specs|spec)$/i.test(h) ||
            h.includes("rating") || h.includes("range") || (h.includes("spec") && !h.includes("desc"))
        )) {
            ratingSpecColNum = colNum;
            return;
        }

        // Qty: e.g. "QTY", "QUANTITY", "QNTY", "COUNT", "NOS", "REQ QTY"
        if (qtyColNum < 0 && (/^(qty|quantity|qnty|count|nos|quantity\s*\(nos\)|req\s*qty|required\s*qty)$/i.test(h) || (h.includes("qty") && !h.includes("code") && !h.includes("unit")))) {
            qtyColNum = colNum;
            return;
        }

        // Unit Price / Rate: e.g. "UNIT PRICE", "RATE", "PRICE", "UNIT RATE", "PRICE (PKR)"
        if (unitPriceColNum < 0 && (h.includes("unit price") || h.includes("unit rate") || h === "rate" || h === "price" || h.includes("price (pkr)") || h.includes("rate (pkr)") || h.includes("unit cost"))) {
            unitPriceColNum = colNum;
            return;
        }

        // Total Price / Amount: e.g. "TOTAL PRICE", "TOTAL AMOUNT", "AMOUNT", "TOTAL"
        if (totalPriceColNum < 0 && (h.includes("total price") || h.includes("total amount") || h === "total" || h === "amount" || h.includes("total price (pkr)") || h.includes("total (pkr)"))) {
            totalPriceColNum = colNum;
            return;
        }

        // Combined Brand / Model column: e.g. "BRAND / MODEL", "MAKE / MODEL"
        if (brandModelColNum < 0 && (h.includes("brand") || h.includes("make")) && h.includes("model")) {
            brandModelColNum = colNum;
            return;
        }

        // Broader Brand match if dedicated brand wasn't found yet
        if (brandColNum < 0 && (h.includes("brand") || h.includes("make") || h.includes("manufacturer") || h.includes("vendor"))) {
            brandColNum = colNum;
            return;
        }

        // Broader Model match if dedicated model wasn't found yet
        if (modelColNum < 0 && (h.includes("model") || h.includes("part no") || h.includes("cat no") || h.includes("item code"))) {
            modelColNum = colNum;
            return;
        }

        // Category / Section / Group
        if (categoryColNum < 0 && (h === "category" || h.includes("category") || h === "section" || h === "group" || h === "panel")) {
            categoryColNum = colNum;
            return;
        }

        // Unit / UOM
        if (unitColNum < 0 && (/^(unit|uom|unit of measure|u\.o\.m)$/i.test(h))) {
            unitColNum = colNum;
            return;
        }

        // Description / Particulars
        if (descColNum < 0 && (h.includes("desc") || h.includes("particular") || h === "item" || h === "product" || h.includes("item desc") || h.includes("item name"))) {
            descColNum = colNum;
            return;
        }
    });

    // If description col is still not identified, pick the first available non-specialized column
    if (descColNum < 0) {
        for (const [colNum] of headerColMap) {
            if (colNum !== brandColNum && colNum !== modelColNum && colNum !== ratingSpecColNum && colNum !== qtyColNum && colNum !== unitPriceColNum && colNum !== totalPriceColNum) {
                descColNum = colNum;
                break;
            }
        }
    }

    const items: BOQItem[] = [];
    let lastKnownBrand = "";

    // Detect default brand from file name or worksheet name if present
    const KNOWN_DOC_BRANDS = [
        "ABB", "Schneider", "Siemens", "Legrand", "Chint", "Tence", "ITL",
        "Mouua", "Monua", "Eaton", "Hager", "Mitsubishi", "Fuji", "Terasaki",
        "Hyundai", "Himel", "Socomec", "Lovato"
    ];
    for (const b of KNOWN_DOC_BRANDS) {
        if (new RegExp(`\\b${b}\\b`, "i").test(fileName || "") || new RegExp(`\\b${b}\\b`, "i").test(ws.name || "")) {
            lastKnownBrand = b;
            break;
        }
    }

    for (let r = headerRowIndex + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const getCellValue = (colNum: number): string => {
            if (!colNum || colNum <= 0) return "";
            const cell = row.getCell(colNum);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let val: any = cell.value;
            // Handle merged cells in Excel
            if ((val === null || val === undefined || val === "") && (cell as any).isMerged && (cell as any).master) {
                val = (cell as any).master.value;
            }
            if (val === null || val === undefined) return "";
            if (typeof val === "object" && "result" in (val as object)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return String((val as any).result ?? "").trim();
            }
            return String(val).trim();
        };

        const rawDesc = getCellValue(descColNum);
        const rawBrand = getCellValue(brandColNum);
        const rawModel = getCellValue(modelColNum);
        const rawBrandModel = getCellValue(brandModelColNum);
        const rawSpec = getCellValue(ratingSpecColNum);
        const rawCategory = getCellValue(categoryColNum);
        const rawQty = qtyColNum > 0 ? getCellValue(qtyColNum) : "1";
        const rawUnit = unitColNum > 0 ? getCellValue(unitColNum) : "Pcs";
        const rawUnitPrice = unitPriceColNum > 0 ? getCellValue(unitPriceColNum) : "";
        const rawTotalPrice = totalPriceColNum > 0 ? getCellValue(totalPriceColNum) : "";

        // Skip section divider rows with no description, no brand, and no spec
        if (!rawDesc && !rawBrand && !rawModel && !rawBrandModel && !rawSpec) {
            continue;
        }

        // Skip accidental header repeats
        if (rawDesc && headerColMap.get(descColNum) && rawDesc.toLowerCase() === headerColMap.get(descColNum)?.toLowerCase()) {
            continue;
        }

        const qty = parsePrice(rawQty) || 1;
        const unitPrice = rawUnitPrice ? parsePrice(rawUnitPrice) : undefined;
        const totalPrice = rawTotalPrice ? parsePrice(rawTotalPrice) : (unitPrice ? unitPrice * qty : undefined);

        // Resolve Brand securely
        let brand = "";
        if (rawBrand && isValidBrandName(rawBrand)) {
            brand = rawBrand;
            lastKnownBrand = rawBrand;
        } else if (rawBrandModel) {
            // Check if combined column has a brand token
            const tokens = rawBrandModel.split(/[\s\/\-_]+/);
            for (const t of tokens) {
                if (isValidBrandName(t)) {
                    brand = t;
                    lastKnownBrand = t;
                    break;
                }
            }
        }

        // If brand not found yet, check description
        if (!brand && rawDesc) {
            for (const b of KNOWN_DOC_BRANDS) {
                const regex = new RegExp(`\\b${b}\\b`, "i");
                if (regex.test(rawDesc)) {
                    brand = b;
                    lastKnownBrand = b;
                    break;
                }
            }
        }

        // Inherit brand from preceding rows / merged section if not explicitly specified
        if (!brand && lastKnownBrand) {
            brand = lastKnownBrand;
        }

        // Resolve Model & Spec
        let model = "";
        if (rawModel) {
            model = rawModel;
        } else if (rawBrandModel) {
            // Strip brand out of combined model string if detected
            model = brand ? rawBrandModel.replace(new RegExp(`\\b${brand}\\b`, "i"), "").trim() : rawBrandModel;
        } else if (rawSpec) {
            model = rawSpec;
        }

        // Construct full requirement description cleanly
        const descParts: string[] = [];
        if (rawDesc) descParts.push(rawDesc);
        if (rawSpec && !rawDesc.toLowerCase().includes(rawSpec.toLowerCase())) {
            descParts.push(rawSpec);
        }
        if (model && model !== rawSpec && !rawDesc.toLowerCase().includes(model.toLowerCase())) {
            descParts.push(model);
        }
        if (brand && !descParts.some((p) => p.toLowerCase().includes(brand.toLowerCase()))) {
            descParts.push(brand);
        }

        const fullDescription = descParts.join(" - ") || rawSpec || rawModel || rawBrand || "Electrical Requirement Item";

        items.push({
            id: nanoid(),
            lineNo: items.length + 1,
            description: fullDescription,
            qty,
            unit: rawUnit || "Pcs",
            brand: brand || undefined,
            model: model || undefined,
            category: rawCategory || undefined,
            unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
            totalPrice: totalPrice && totalPrice > 0 ? totalPrice : undefined,
            currency: "PKR",
        });
    }

    return items;
}

/**
 * Parse PDF requirement file
 */
export async function parsePdfRequirements(buffer: Buffer): Promise<BOQItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import("pdf-parse");
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;

    const parser = new PDFParse({ data: buffer });
    let fullText = "";

    try {
        const textResult = await parser.getText();
        fullText = textResult?.text || "";
    } catch (e) {
        console.warn("PDF getText failed:", e);
    }

    // 1. AI extraction if OpenAI API key is present
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && fullText.trim().length > 30) {
        try {
            const openai = new OpenAI({ apiKey });
            const prompt = `You are an expert at extracting electrical Bill of Quantities (BOQ), requirement lists, and Schedule of Rates.
Extract all requested items into a structured list.

Return ONLY a valid JSON object with format:
{
  "items": [
    {
      "description": "250A 3P 36kA MCCB Schneider Electric",
      "qty": 4,
      "unit": "EA"
    }
  ]
}

Text to extract from:
${fullText.slice(0, 25000)}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
                response_format: { type: "json_object" },
            });

            const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return parsed.items.map((it: any, i: number) => ({
                    id: nanoid(),
                    lineNo: i + 1,
                    description: String(it.description || ""),
                    qty: typeof it.qty === "number" ? it.qty : parsePrice(it.qty) || 1,
                    unit: it.unit || "EA",
                }));
            }
        } catch (aiErr) {
            console.warn("AI PDF extraction failed, falling back to local extractor:", aiErr);
        }
    }

    // 2. Table extraction with pdf-parse
    try {
        const tableResult = await parser.getTable();
        const tableItems: BOQItem[] = [];

        if (tableResult?.pages) {
            for (const page of tableResult.pages) {
                for (const table of page.tables || []) {
                    if (table.length >= 2) {
                        const headers = table[0].map((c: string) => c.toLowerCase().trim());
                        let descCol = headers.findIndex((h: string) => h.includes("desc") || h.includes("item") || h.includes("particular"));
                        let qtyCol = headers.findIndex((h: string) => h.includes("qty") || h.includes("quantity") || h.includes("nos"));
                        if (descCol < 0) descCol = 0;
                        if (qtyCol < 0) qtyCol = headers.length > 1 ? 1 : -1;

                        for (let r = 1; r < table.length; r++) {
                            const row = table[r];
                            const desc = (row[descCol] || "").trim();
                            const qty = qtyCol >= 0 ? parsePrice(row[qtyCol]) || 1 : 1;
                            if (desc.length >= 3) {
                                tableItems.push({
                                    id: nanoid(),
                                    lineNo: tableItems.length + 1,
                                    description: desc,
                                    qty,
                                    unit: "EA",
                                });
                            }
                        }
                    }
                }
            }
        }

        if (tableItems.length > 0) {
            return tableItems;
        }
    } catch (tblErr) {
        console.warn("PDF table extraction failed:", tblErr);
    }

    // 3. Fallback: Smart plain text parsing
    if (fullText.trim().length > 15) {
        const textItems = parseTextToRequirementItems(fullText);
        if (textItems.length > 0) {
            return textItems;
        }
    }

    // 4. Scanned PDF fallback
    try {
        const imageResult = await parser.getImage({ imageDataUrl: true });
        if (imageResult?.pages && imageResult.pages.length > 0) {
            for (const page of imageResult.pages) {
                for (const img of page.images || []) {
                    if (img.data && img.data.length > 500) {
                        const imgBuffer = Buffer.from(img.data);
                        const imgItems = await parseImageRequirements(imgBuffer, "image/png");
                        if (imgItems.length > 0) return imgItems;
                    }
                }
            }
        }
    } catch (imgErr) {
        console.warn("PDF OCR failed:", imgErr);
    }

    throw new Error("Could not extract items from this PDF requirement file.");
}

/**
 * Parse Image (PNG, JPG, WEBP) requirement file
 */
export async function parseImageRequirements(buffer: Buffer, mimeType: string): Promise<BOQItem[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. OpenAI Vision
    if (apiKey) {
        try {
            const openai = new OpenAI({ apiKey });
            const base64 = buffer.toString("base64");
            const dataUrl = `data:${mimeType};base64,${base64}`;

            const prompt = `You are an expert AI specialized in reading electrical requirement schedules, Bill of Quantities (BOQ), and single line diagrams.
Extract all requested electrical product requirements, equipment, circuit breakers, and switches shown in this image.

Return ONLY a valid JSON object with format:
{
  "items": [
    {
      "description": "40A 3P 10kA MCB Schneider Electric",
      "qty": 6,
      "unit": "EA"
    }
  ]
}

Include all ratings (Amps, Poles, kA, Brand) in the description.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: dataUrl } },
                        ],
                    },
                ],
                temperature: 0,
                response_format: { type: "json_object" },
            });

            const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return parsed.items.map((it: any, i: number) => ({
                    id: nanoid(),
                    lineNo: i + 1,
                    description: String(it.description || ""),
                    qty: typeof it.qty === "number" ? it.qty : parsePrice(it.qty) || 1,
                    unit: it.unit || "EA",
                }));
            }
        } catch (aiErr) {
            console.warn("AI Image extraction failed, falling back to Tesseract OCR:", aiErr);
        }
    }

    // 2. Offline / Local fallback: Tesseract OCR
    try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const ocrResult = await worker.recognize(buffer);
        await worker.terminate();

        const text = ocrResult.data.text || "";
        if (text.trim().length > 10) {
            const items = parseTextToRequirementItems(text);
            if (items.length > 0) return items;
        }
    } catch (ocrErr) {
        console.error("Tesseract OCR error:", ocrErr);
    }

    throw new Error("Could not detect tabular electrical requirements in this image.");
}

/**
 * Universal Requirement Document entry point
 */
export async function processRequirementDocument(
    buffer: Buffer,
    fileName: string
): Promise<{ items: BOQItem[]; totalItems: number; fileName: string; fileType: string }> {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    const SPREADSHEET_EXTS = ["xlsx", "xls", "csv"];
    const PDF_EXTS = ["pdf"];
    const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "tiff"];

    let items: BOQItem[] = [];
    let fileType = "spreadsheet";

    if (SPREADSHEET_EXTS.includes(ext)) {
        fileType = "spreadsheet";
        items = await parseSpreadsheetRequirements(buffer, ext, fileName);
    } else if (PDF_EXTS.includes(ext)) {
        fileType = "pdf";
        items = await parsePdfRequirements(buffer);
    } else if (IMAGE_EXTS.includes(ext)) {
        fileType = "image";
        const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        items = await parseImageRequirements(buffer, mimeType);
    } else {
        throw new Error(`Unsupported requirement file format (.${ext}). Supported formats: Excel (XLSX, XLS), CSV, PDF, and Images (PNG, JPG, WEBP).`);
    }

    return {
        items,
        totalItems: items.length,
        fileName,
        fileType,
    };
}

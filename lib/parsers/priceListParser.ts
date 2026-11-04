// =============================================================================
// ELECTRICAL MASTER — Universal Price List Document Parser
// Supports: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Images (.png, .jpg, .jpeg, .webp)
// Supports both AI (OpenAI Vision & Text) and Local/Offline (pdf-parse & Tesseract OCR)
// =============================================================================

if (typeof window !== "undefined") {
    throw new Error("lib/parsers/priceListParser is server-only and cannot be executed in the browser bundle.");
}

import ExcelJS from "exceljs";
import OpenAI from "openai";
import { parsePrice, parsePercent, nanoid } from "../utils";
import type { ColumnMapping, StandardField, ImportPreview } from "../types";

// Known column header → standard field mappings (keyword-based heuristic)
export const HEADER_HINTS: Array<{ patterns: string[]; field: StandardField }> = [
    {
        patterns: ["product code", "productcode", "part no", "partno", "part number", "item code", "itemcode", "sku", "code", "ref", "cat no", "catalogue no"],
        field: "product_code",
    },
    {
        patterns: ["description", "product name", "productname", "product desc", "item desc", "item name", "name", "product", "details", "specification"],
        field: "description",
    },
    {
        patterns: ["brand", "manufacturer", "make", "supplier", "vendor"],
        field: "brand",
    },
    {
        patterns: ["list price", "listprice", "price", "rrp", "unit price", "unitprice", "sell price", "cost", "rate", "amount"],
        field: "list_price",
    },
    {
        patterns: ["discount", "disc", "discount %", "disc %", "discount rate", "trade discount"],
        field: "discount",
    },
    {
        patterns: ["currency", "curr", "ccy"],
        field: "currency",
    },
    {
        patterns: ["category", "cat", "group", "product group", "product cat", "family"],
        field: "category",
    },
    {
        patterns: ["unit", "uom", "unit of measure", "qty unit"],
        field: "unit",
    },
];

export function heuristicMapHeader(header: string): { field: StandardField; confidence: number } {
    const h = header.toLowerCase().trim();
    // Prioritize price patterns so "unit price" or "price -pkr" is never misidentified as "unit"
    if (h.includes("price") || h.includes("rate") || h.includes("cost") || h.includes("pkr") || h.includes("rs")) {
        return { field: "list_price", confidence: 0.95 };
    }
    for (const hint of HEADER_HINTS) {
        for (const pattern of hint.patterns) {
            if (h === pattern) return { field: hint.field, confidence: 0.95 };
            if (h.includes(pattern) || pattern.includes(h)) {
                return { field: hint.field, confidence: 0.75 };
            }
        }
    }
    return { field: "ignore", confidence: 0.0 };
}

export function buildMappings(headers: string[]): ColumnMapping[] {
    return headers.map((h) => {
        const { field, confidence } = heuristicMapHeader(h);
        return {
            originalHeader: h,
            mappedTo: field,
            confidence,
            aiSuggested: false,
        };
    });
}

/**
 * Heuristically parses multi-line text into price list rows
 */
export function parseTextToPriceListRows(text: string, defaultBrand = ""): {
    headers: string[];
    rows: Record<string, string>[];
} {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const detectedHeaders = ["Product Code", "Description", "List Price", "Discount", "Unit"];
    const rows: Record<string, string>[] = [];
    const seenKeys = new Set<string>();

    // ── 1. Column-Block Matrix Extractor (for PDF column-by-column dumps) ──
    const cleanLines = lines.filter((l) => !/^(--\s*\d+\s*of\s*\d+\s*--|page\s+\d+|^\d{1,2}$)/i.test(l));
    const isPriceToken = (s: string) =>
        /^[0-9]{1,3}(,[0-9]{3})+(\.[0-9]{1,2})?$/.test(s) ||
        /^(?:PKR|Rs\.?)\s*[0-9,]+/i.test(s) ||
        (/^[0-9]{3,6}$/.test(s) && parseInt(s) >= 200 && parseInt(s) !== 800 && parseInt(s) !== 1000 && parseInt(s) !== 1250 && parseInt(s) !== 1600);
    const isModelToken = (s: string) =>
        /^[A-Z0-9]{2,}[A-Z0-9\-\/\.\s]{1,25}$/i.test(s) &&
        !isPriceToken(s) &&
        !/\b(kA|kV|Amp|Amps|Pole|Poles|Fixed|Plug-in|Drawout|VAC|VDC|Hz)\b/i.test(s) &&
        !/^(page|table|total|subtotal|fixed|drawout|standard|model|price|ref|rating|terms|general|warranty)/i.test(s);

    let mIdx = 0;
    while (mIdx < cleanLines.length) {
        if (isPriceToken(cleanLines[mIdx])) {
            const pStart = mIdx;
            while (mIdx < cleanLines.length && (isPriceToken(cleanLines[mIdx]) || /^On Request$/i.test(cleanLines[mIdx]))) {
                mIdx++;
            }
            const count = mIdx - pStart;
            if (count >= 2) {
                const prices = cleanLines.slice(pStart, mIdx);
                let modelStart = -1;
                let stepFound = 0;
                for (let step = 1; step <= 8; step++) {
                    const candStart = pStart - count * step;
                    if (candStart < 0) break;
                    const candLines = cleanLines.slice(candStart, candStart + count);
                    const validCount = candLines.filter((l) => isModelToken(l)).length;
                    if (validCount >= Math.ceil(count * 0.75)) {
                        modelStart = candStart;
                        stepFound = step;
                    }
                }

                if (modelStart !== -1) {
                    const models = cleanLines.slice(modelStart, modelStart + count);
                    const attrBlocks: string[][] = [];
                    for (let s = 1; s < stepFound; s++) {
                        attrBlocks.push(cleanLines.slice(pStart - count * s, pStart - count * s + count));
                    }

                    for (let k = 0; k < count; k++) {
                        const m = models[k];
                        const p = prices[k];
                        if (p.toLowerCase() === "on request") continue;
                        const numPrice = p.replace(/[^0-9.]/g, "");
                        if (!numPrice || parseFloat(numPrice) <= 0) continue;

                        const extra = attrBlocks.map((ab) => ab[k]).filter(Boolean).reverse().join(" ");
                        const desc = extra ? `${m} - ${extra}` : m;
                        const key = `${m}::${numPrice}`.toLowerCase();
                        if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            rows.push({
                                "Product Code": m,
                                "Description": desc,
                                "List Price": numPrice,
                                "Discount": "0%",
                                "Unit": "Pcs",
                            });
                        }
                    }
                }
            }
        } else {
            mIdx++;
        }
    }

    // ── 2. Line-by-Line Extractor (for horizontal rows) ──

    // Unit match pattern
    const unitRegex = /\b(EA|EACH|M|MTR|METRE|METER|SET|LOT|PC|PCS|ROLL|BOX|PACK|NO|NOS|PAIR|DRUM)\b/i;
    // Price pattern: digits with optional decimal or currency prefix (including PKR, Rs, etc.)
    const priceRegex = /(?:[\$£€]|AUD|USD|PKR|RS\.?|AED|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]{2,7}(?:\.[0-9]{1,2})?)\b/i;
    // Percentage pattern (e.g. 15%, 12.5%)
    const percentRegex = /(?:^|\s)([0-9]{1,2}(?:\.[0-9]+)?%)(?:$|\s)/;
    // Skip line patterns (metadata, page markers, table headers)
    const skipRegex = /^(page\s+\d+|--\s*\d+\s*of\s*\d+\s*--|total|subtotal|terms|validity|date|quotation|invoice|tax\s+invoice)/i;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.length < 4 || skipRegex.test(line)) continue;

        // Skip exact header row matches
        if (
            (line.toLowerCase().includes("code") || line.toLowerCase().includes("part")) &&
            (line.toLowerCase().includes("desc") || line.toLowerCase().includes("item")) &&
            line.toLowerCase().includes("price")
        ) {
            continue;
        }

        // Try delimited split: pipe, tab, or 2+ consecutive spaces
        let tokens: string[] = [];
        if (line.includes("|")) {
            tokens = line.split("|").map((t) => t.trim()).filter(Boolean);
        } else if (line.includes("\t")) {
            tokens = line.split("\t").map((t) => t.trim()).filter(Boolean);
        } else if (/\s{2,}/.test(line)) {
            tokens = line.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean);
        }

        if (tokens.length >= 3) {
            // Find price token
            let priceVal = "";
            let discVal = "";
            let unitVal = "";
            const remainingTokens: string[] = [];

            for (const t of tokens) {
                if (!priceVal && priceRegex.test(t)) {
                    const m = t.match(priceRegex);
                    if (m) {
                        priceVal = m[1].replace(/,/g, "");
                        continue;
                    }
                }
                if (!discVal && percentRegex.test(t)) {
                    discVal = t;
                    continue;
                }
                if (!unitVal && unitRegex.test(t) && t.length <= 6) {
                    unitVal = t.toUpperCase();
                    continue;
                }
                remainingTokens.push(t);
            }

            if (priceVal && remainingTokens.length >= 1) {
                const productCode = remainingTokens[0];
                const description = remainingTokens.slice(1).join(" ") || productCode;

                rows.push({
                    "Product Code": productCode,
                    "Description": description,
                    "List Price": priceVal,
                    "Discount": discVal,
                    "Unit": unitVal || "EA",
                });
                continue;
            }
        }

        // Fallback for single-space lines:
        // Try regex extraction of Code at start, Price at end
        const priceMatch = line.match(/(?:[\$£€]|AUD|USD|PKR|RS\.?|AED|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]{2,7}(?:\.[0-9]{1,2})?)(?:\s*(?:EA|EACH|M|PCS|PKR|%)|\s*$)/i);
        if (priceMatch && priceMatch.index !== undefined) {
            const rawPrice = priceMatch[1].replace(/,/g, "");
            const beforePrice = line.substring(0, priceMatch.index).trim();
            const afterPrice = line.substring(priceMatch.index + priceMatch[0].length).trim();

            let unitVal = "";
            let discVal = "";
            if (unitRegex.test(afterPrice)) {
                unitVal = afterPrice.match(unitRegex)?.[0].toUpperCase() || "";
            }
            if (percentRegex.test(afterPrice)) {
                discVal = afterPrice.match(percentRegex)?.[0] || "";
            }

            // Extract code and description from beforePrice
            // Code is typically the first token (alphanumeric, e.g. A9F74116, EZC100F3100, 140M-C2E-B16)
            const codeMatch = beforePrice.match(/^([A-Za-z0-9\/\.\-_]{2,30})\s+(.+)$/);
            if (codeMatch) {
                const code = codeMatch[1];
                const desc = codeMatch[2].trim();

                rows.push({
                    "Product Code": code,
                    "Description": desc,
                    "List Price": rawPrice,
                    "Discount": discVal,
                    "Unit": unitVal || "EA",
                });
            } else if (beforePrice.length >= 2) {
                rows.push({
                    "Product Code": beforePrice.split(/\s+/)[0],
                    "Description": beforePrice,
                    "List Price": rawPrice,
                    "Discount": discVal,
                    "Unit": unitVal || "EA",
                });
            }
        }
    }

    return {
        headers: detectedHeaders,
        rows,
    };
}

/**
 * Parse Excel (.xlsx, .xls) or CSV file
 */
export async function parseSpreadsheet(
    buffer: Buffer,
    ext: string,
    sheetName?: string
): Promise<{
    sheets: string[];
    selectedSheet: string;
    headers: string[];
    rows: Record<string, string>[];
}> {
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

    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    if (sheetNames.length === 0) {
        throw new Error("No sheets found in file.");
    }

    const targetSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
    const ws = workbook.getWorksheet(targetSheetName);
    if (!ws) {
        throw new Error("Could not read sheet.");
    }

    // Find header row (first row with multiple non-empty string cells)
    let headerRowIndex = 1;
    let headers: string[] = [];
    const colHeaderMap: { colNumber: number; header: string }[] = [];

    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const map: { colNumber: number; header: string }[] = [];
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const v = String(cell.value || "").trim();
            if (v) map.push({ colNumber, header: v });
        });
        if (map.length >= 3) {
            headerRowIndex = r;
            headers = map.map((m) => m.header);
            colHeaderMap.push(...map);
            break;
        }
    }

    if (headers.length === 0) {
        throw new Error("Could not detect column headers in this spreadsheet.");
    }

    const rows: Record<string, string>[] = [];
    for (let r = headerRowIndex + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const rowData: Record<string, string> = {};
        let isEmpty = true;

        colHeaderMap.forEach(({ colNumber, header }) => {
            const cell = row.getCell(colNumber);
            let val = "";
            if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === "object" && "result" in (cell.value as object)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    val = String((cell.value as any).result ?? "");
                } else {
                    val = String(cell.value);
                }
                if (val.trim()) isEmpty = false;
            }
            rowData[header] = val;
        });

        if (!isEmpty) {
            rows.push(rowData);
        }
    }

    return {
        sheets: sheetNames,
        selectedSheet: targetSheetName,
        headers,
        rows,
    };
}

/**
 * Parse PDF document using pdf-parse and/or OpenAI
 */
export async function parsePdfDocument(
    buffer: Buffer,
    defaultBrand = ""
): Promise<{
    sheets: string[];
    selectedSheet: string;
    headers: string[];
    rows: Record<string, string>[];
    extractionMethod: string;
}> {
    // Dynamic import to support Next.js server external packaging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import("pdf-parse");
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;

    const parser = new PDFParse({ data: buffer });
    let fullText = "";
    let pageCount = 1;

    try {
        const textResult = await parser.getText();
        fullText = textResult?.text || "";
        pageCount = textResult?.total || 1;
    } catch (e) {
        console.warn("PDF getText failed:", e);
    }

    // 1. If OpenAI API key is configured and we have extracted text, use AI extraction for highest accuracy
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && fullText.trim().length > 30) {
        try {
            const openai = new OpenAI({ apiKey });
            const prompt = `You are an expert at extracting structured electrical product price lists and catalogs.
Extract every product row from the following PDF text into a clean table format.

Return ONLY a valid JSON object with this exact format:
{
  "headers": ["Product Code", "Description", "List Price", "Discount", "Category", "Unit"],
  "rows": [
    {
      "Product Code": "A9F74116",
      "Description": "Acti9 iC60N 1P 16A C-Curve MCB",
      "List Price": "45.50",
      "Discount": "15%",
      "Category": "Miniature Circuit Breakers",
      "Unit": "EA"
    }
  ]
}

Ensure "List Price" contains clean numeric values (e.g. 45.50).
Extract ALL product rows present in the text.

Text to extract from:
${fullText.slice(0, 25000)}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
                response_format: { type: "json_object" },
            });

            const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
            if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
                const headers = Array.isArray(parsed.headers) && parsed.headers.length > 0
                    ? parsed.headers
                    : Object.keys(parsed.rows[0]);

                return {
                    sheets: [`All Pages (${pageCount})`],
                    selectedSheet: `All Pages (${pageCount})`,
                    headers,
                    rows: parsed.rows,
                    extractionMethod: "AI Document Analysis (GPT-4o-mini)",
                };
            }
        } catch (aiErr) {
            console.warn("AI PDF extraction failed, falling back to local extractor:", aiErr);
        }
    }

    // 2. Try Table Extraction with pdf-parse
    try {
        const tableResult = await parser.getTable();
        const extractedRows: Record<string, string>[] = [];
        let detectedHeaders: string[] = [];

        if (tableResult?.pages) {
            for (const page of tableResult.pages) {
                for (const table of page.tables || []) {
                    if (table.length >= 2) {
                        // Candidate table
                        const possibleHeaders = table[0].map((c: string) => c.trim()).filter(Boolean);
                        if (possibleHeaders.length >= 2) {
                            if (detectedHeaders.length === 0) detectedHeaders = possibleHeaders;

                            for (let r = 1; r < table.length; r++) {
                                const row = table[r];
                                const rowData: Record<string, string> = {};
                                let hasContent = false;
                                detectedHeaders.forEach((h, idx) => {
                                    const val = (row[idx] || "").trim();
                                    rowData[h] = val;
                                    if (val) hasContent = true;
                                });
                                if (hasContent) extractedRows.push(rowData);
                            }
                        }
                    }
                }
            }
        }

        if (extractedRows.length > 0 && detectedHeaders.length >= 2) {
            return {
                sheets: [`Page Tables (${pageCount})`],
                selectedSheet: `Page Tables (${pageCount})`,
                headers: detectedHeaders,
                rows: extractedRows,
                extractionMethod: "PDF Table Extractor",
            };
        }
    } catch (tblErr) {
        console.warn("PDF Table parsing failed, continuing with text extraction:", tblErr);
    }

    // 3. Fallback to heuristic text parsing (if PDF had text)
    if (fullText.trim().length > 20) {
        const { headers, rows } = parseTextToPriceListRows(fullText, defaultBrand);
        if (rows.length > 0) {
            return {
                sheets: [`Extracted Text (${pageCount})`],
                selectedSheet: `Extracted Text (${pageCount})`,
                headers,
                rows,
                extractionMethod: "PDF Smart Text Extractor",
            };
        }
    }

    // 4. Scanned PDF fallback: extract embedded images and perform OCR
    try {
        const imageResult = await parser.getImage({ imageDataUrl: true });
        if (imageResult?.pages && imageResult.pages.length > 0) {
            for (const page of imageResult.pages) {
                for (const img of page.images || []) {
                    if (img.data && img.data.length > 500) {
                        const imgBuffer = Buffer.from(img.data);
                        const imgRes = await parseImageDocument(imgBuffer, "image/png", defaultBrand);
                        if (imgRes.rows.length > 0) {
                            return {
                                sheets: [`Scanned Page ${page.pageNumber}`],
                                selectedSheet: `Scanned Page ${page.pageNumber}`,
                                headers: imgRes.headers,
                                rows: imgRes.rows,
                                extractionMethod: `Scanned PDF OCR (${imgRes.extractionMethod})`,
                            };
                        }
                    }
                }
            }
        }
    } catch (imgErr) {
        console.warn("PDF image extraction failed:", imgErr);
    }

    throw new Error(
        "Could not extract price list items from this PDF. Please ensure the PDF contains readable text or high-contrast tables."
    );
}

/**
 * Parse Image (PNG, JPG, WEBP, etc.) using OpenAI Vision or Tesseract OCR
 */
export async function parseImageDocument(
    buffer: Buffer,
    mimeType: string,
    defaultBrand = ""
): Promise<{
    sheets: string[];
    selectedSheet: string;
    headers: string[];
    rows: Record<string, string>[];
    extractionMethod: string;
}> {
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. Prefer OpenAI Vision if API key is present
    if (apiKey) {
        try {
            const openai = new OpenAI({ apiKey });
            const base64 = buffer.toString("base64");
            const dataUrl = `data:${mimeType};base64,${base64}`;

            const prompt = `You are an expert AI specialized in optical character recognition (OCR) and document extraction for electrical product price lists, catalogue pages, and quotation sheets.

Analyze this image and extract ALL products/items listed into a structured table.
Standardize columns:
- "Product Code": Part number, item code, reference, or SKU (e.g. A9F74116, EZC100F3100)
- "Description": Full description, technical specs, poles, amperage (e.g. 1P 16A C-Curve 6kA)
- "List Price": Unit price or list price numeric value (e.g. 45.50)
- "Discount": Discount percentage if shown (e.g. 10%)
- "Category": Product type or category
- "Unit": Unit of measure (e.g. EA, M, SET)

Return ONLY a valid JSON object in this format:
{
  "headers": ["Product Code", "Description", "List Price", "Discount", "Category", "Unit"],
  "rows": [
    {
      "Product Code": "...",
      "Description": "...",
      "List Price": "...",
      "Discount": "...",
      "Category": "...",
      "Unit": "..."
    }
  ]
}

Ensure "List Price" contains clean numeric strings. Extract EVERY visible item row.`;

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
            if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
                const headers = Array.isArray(parsed.headers) && parsed.headers.length > 0
                    ? parsed.headers
                    : Object.keys(parsed.rows[0]);

                return {
                    sheets: ["Image Page 1"],
                    selectedSheet: "Image Page 1",
                    headers,
                    rows: parsed.rows,
                    extractionMethod: "AI Vision (GPT-4o-mini)",
                };
            }
        } catch (aiErr) {
            console.warn("OpenAI Vision failed, falling back to Tesseract OCR:", aiErr);
        }
    }

    // 2. Offline / Local fallback: Tesseract.js OCR
    try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const ocrResult = await worker.recognize(buffer);
        await worker.terminate();

        const text = ocrResult.data.text || "";
        if (text.trim().length > 10) {
            const { headers, rows } = parseTextToPriceListRows(text, defaultBrand);
            if (rows.length > 0) {
                return {
                    sheets: ["OCR Page 1"],
                    selectedSheet: "OCR Page 1",
                    headers,
                    rows,
                    extractionMethod: "Local Tesseract OCR Engine",
                };
            }
        }
    } catch (ocrErr) {
        console.error("Tesseract OCR error:", ocrErr);
    }

    throw new Error(
        "Could not detect tabular price list data in this image. Please ensure the image is clear and contains readable product codes and prices."
    );
}

/**
 * Universal Price List Processor entry point
 */
export async function processPriceListDocument(
    buffer: Buffer,
    fileName: string,
    brand = "",
    sheetName?: string
): Promise<ImportPreview & { extractionMethod?: string }> {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    const SPREADSHEET_EXTS = ["xlsx", "xls", "csv"];
    const PDF_EXTS = ["pdf"];
    const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "tiff"];

    let sheets: string[] = ["Sheet1"];
    let selectedSheet = "Sheet1";
    let headers: string[] = [];
    let rows: Record<string, string>[] = [];
    let fileType: "spreadsheet" | "pdf" | "image" = "spreadsheet";
    let extractionMethod: string | undefined = undefined;

    if (SPREADSHEET_EXTS.includes(ext)) {
        fileType = "spreadsheet";
        const res = await parseSpreadsheet(buffer, ext, sheetName);
        sheets = res.sheets;
        selectedSheet = res.selectedSheet;
        headers = res.headers;
        rows = res.rows;
        extractionMethod = "Spreadsheet Engine";
    } else if (PDF_EXTS.includes(ext)) {
        fileType = "pdf";
        const res = await parsePdfDocument(buffer, brand);
        sheets = res.sheets;
        selectedSheet = res.selectedSheet;
        headers = res.headers;
        rows = res.rows;
        extractionMethod = res.extractionMethod;
    } else if (IMAGE_EXTS.includes(ext)) {
        fileType = "image";
        const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const res = await parseImageDocument(buffer, mimeType, brand);
        sheets = res.sheets;
        selectedSheet = res.selectedSheet;
        headers = res.headers;
        rows = res.rows;
        extractionMethod = res.extractionMethod;
    } else {
        throw new Error(
            `Unsupported file format: .${ext}. Supported formats: XLSX, XLS, CSV, PDF, and Images (PNG, JPG, WEBP).`
        );
    }

    const mappings = buildMappings(headers);

    return {
        priceListId: nanoid(),
        fileName,
        fileType,
        sheets,
        selectedSheet,
        headers,
        mappings,
        previewRows: rows, // Send full parsed rows so user can confirm and import all items
        totalRows: rows.length,
        extractionMethod,
    };
}

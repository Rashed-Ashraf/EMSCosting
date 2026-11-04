// =============================================================================
// API: Generate Costing Excel
// POST /api/excel/generate
// Returns: Excel file stream
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { CostingSession } from "@/lib/types";
import { formatPercent, formatCurrency } from "@/lib/calculations";

export async function POST(req: NextRequest) {
    try {
        const { session } = await req.json() as { session: CostingSession };

        if (!session) {
            return NextResponse.json({ error: "No costing session provided" }, { status: 400 });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Electrical Master Switchgear";
        workbook.created = new Date();

        const ws = workbook.addWorksheet("Costing", {
            pageSetup: { paperSize: 9, orientation: "landscape" },
        });

        const { header, items, totals } = session;
        const curr = header.currency || "AUD";

        // ─── Company Header ───────────────────────────────────────────────────────
        ws.mergeCells("A1:L1");
        const titleCell = ws.getCell("A1");
        titleCell.value = "ELECTRICAL MASTER SWITCHGEAR";
        titleCell.font = { bold: true, size: 16, color: { argb: "FF1a3a6b" } };
        titleCell.alignment = { horizontal: "center" };

        ws.mergeCells("A2:L2");
        const subtitleCell = ws.getCell("A2");
        subtitleCell.value = "COSTING SHEET";
        subtitleCell.font = { bold: true, size: 12, color: { argb: "FF444444" } };
        subtitleCell.alignment = { horizontal: "center" };

        ws.addRow([]);

        // ─── Project Info ─────────────────────────────────────────────────────────
        const infoRows = [
            ["Customer:", header.customerName, "", "Project:", header.project],
            ["Company:", header.company, "", "Reference:", header.reference],
            ["Date:", header.date, "", "Currency:", curr],
        ];
        for (const row of infoRows) {
            const r = ws.addRow(row);
            r.getCell(1).font = { bold: true, color: { argb: "FF555555" } };
            r.getCell(4).font = { bold: true, color: { argb: "FF555555" } };
        }

        ws.addRow([]);

        // ─── Column Headers ───────────────────────────────────────────────────────
        const colHeaders = [
            "Item", "Product Code", "Brand", "Description",
            "Qty", "List Price", "Discount", "Net Cost",
            "Margin", "Selling Price", "Total Cost", "Total Selling",
        ];
        const headerRow = ws.addRow(colHeaders);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a3a6b" } };
            cell.alignment = { horizontal: "center", wrapText: true };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // Set column widths
        ws.columns = [
            { width: 6 },   // Item
            { width: 16 },  // Product Code
            { width: 14 },  // Brand
            { width: 38 },  // Description
            { width: 7 },   // Qty
            { width: 13 },  // List Price
            { width: 11 },  // Discount
            { width: 13 },  // Net Cost
            { width: 10 },  // Margin
            { width: 14 },  // Selling Price
            { width: 13 },  // Total Cost
            { width: 14 },  // Total Selling
        ];

        // ─── Data Rows ─────────────────────────────────────────────────────────────
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isEven = i % 2 === 1;
            const row = ws.addRow([
                i + 1,
                item.product.productCode,
                item.product.brand,
                item.customDescription || item.product.description,
                item.qty,
                item.listPrice,
                item.discount,
                item.netCost,
                item.margin,
                item.sellingPrice,
                item.totalCost,
                item.totalSelling,
            ]);

            row.eachCell((cell, colNumber) => {
                cell.alignment = { vertical: "middle", wrapText: colNumber === 4 };
                cell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };
                if (isEven) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F6FF" } };
                }
                // Number formatting
                if ([6, 8, 10, 11, 12].includes(colNumber)) {
                    cell.numFmt = `"${curr}" #,##0.00`;
                }
                if ([7, 9].includes(colNumber)) {
                    cell.numFmt = "0.0%";
                }
            });
        }

        ws.addRow([]);

        // ─── Totals ───────────────────────────────────────────────────────────────
        const totalsData = [
            ["", "", "", "", "", "", "", "", "", "Subtotal Cost:", totals.subtotalCost, ""],
            ["", "", "", "", "", "", "", "", "", "Subtotal Selling:", "", totals.subtotalSelling],
            ["", "", "", "", "", "", "", "", "", `GST (${Math.round(session.header.gstRate * 100)}%):`, "", totals.gstAmount],
            ["", "", "", "", "", "", "", "", "", "GRAND TOTAL:", "", totals.grandTotal],
        ];
        for (const [idx, rowData] of totalsData.entries()) {
            const row = ws.addRow(rowData);
            const labelCell = row.getCell(10);
            const valCell = row.getCell(idx < 2 ? 11 : 12);
            labelCell.font = { bold: true };
            valCell.font = { bold: idx === 3, size: idx === 3 ? 12 : 11 };
            if ([11, 12].includes(10)) valCell.numFmt = `"${curr}" #,##0.00`;
            if (idx === 3) {
                valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a3a6b" } };
                valCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
            }
        }

        // ─── Notes ────────────────────────────────────────────────────────────────
        if (header.notes) {
            ws.addRow([]);
            ws.addRow(["Notes:", header.notes]);
        }

        // Generate buffer
        const arrayBuffer = await workbook.xlsx.writeBuffer();
        const date = new Date().toISOString().split("T")[0];
        const ref = header.reference || "001";
        const filename = `Electrical_Master_Costing_${date}-${ref}.xlsx`;

        return new NextResponse(arrayBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Excel generation error:", err);
        return NextResponse.json({ error: "Failed to generate Excel file." }, { status: 500 });
    }
}

// =============================================================================
// API: Generate Quotation PDF
// POST /api/quotation/pdf
// Returns: PDF stream
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import type { Quotation } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const { quotation } = await req.json() as { quotation: Quotation };
        if (!quotation) {
            return NextResponse.json({ error: "No quotation provided" }, { status: 400 });
        }

        const curr = quotation.currency || "PKR";
        const fmt = (n: number) =>
            curr === "PKR"
                ? `PKR ${new Intl.NumberFormat("en-PK").format(n)}`
                : new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(n);

        // Build HTML quotation template for browser printing
        // In a complete production setup, we'd use @react-pdf/renderer or puppeteer here.
        // For MVP, we generate an HTML page that the client can print-to-PDF.
        const itemRows = quotation.items.map((item, i) => `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td>${item.lineNo}</td>
        <td>${item.productCode || ""}</td>
        <td>${item.brand || ""}</td>
        <td>${item.description}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">${fmt(item.unitPrice)}</td>
        <td style="text-align:right">${fmt(item.totalPrice)}</td>
      </tr>
    `).join("");

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Quotation ${quotation.meta.quotationNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; background: #fff; }
  @page { size: A4; margin: 20mm 15mm; }
  .page { padding: 0; max-width: 210mm; margin: 0 auto; }
  
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1a3a6b; }
  .company-name { font-size: 22pt; font-weight: bold; color: #1a3a6b; }
  .company-sub { font-size: 10pt; color: #555; margin-top: 4px; }
  .doc-label { font-size: 16pt; font-weight: bold; color: #1a3a6b; text-align: right; }
  .doc-num { font-size: 10pt; color: #555; text-align: right; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; }
  .info-box h3 { font-size: 9pt; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .info-row { display: flex; font-size: 10pt; margin-bottom: 4px; }
  .info-label { color: #555; min-width: 90px; }
  .info-value { font-weight: 500; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead { background: #1a3a6b; }
  thead th { color: white; padding: 8px 10px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; }
  thead th:nth-child(5), thead th:nth-child(6), thead th:nth-child(7) { text-align: right; }
  tbody tr.even { background: #f7f9fc; }
  tbody td { padding: 8px 10px; font-size: 10pt; border-bottom: 1px solid #eee; }
  tbody td:nth-child(5) { text-align: center; }
  tbody td:nth-child(6), tbody td:nth-child(7) { text-align: right; }

  .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals-table { width: 280px; }
  .totals-table td { padding: 5px 10px; font-size: 10pt; }
  .totals-table tr.subtotal td:first-child { color: #555; }
  .totals-table tr.subtotal td:last-child { text-align: right; }
  .totals-table tr.gst td { color: #555; }
  .totals-table tr.gst td:last-child { text-align: right; }
  .totals-table tr.grand { background: #1a3a6b; }
  .totals-table tr.grand td { color: white; font-weight: bold; font-size: 12pt; }
  .totals-table tr.grand td:last-child { text-align: right; }

  .footer-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
  .terms-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; font-size: 9pt; color: #555; }
  .terms-box h3 { font-size: 9pt; text-transform: uppercase; font-weight: bold; color: #333; margin-bottom: 6px; }
  
  .signature-area { margin-top: 32px; display: flex; justify-content: space-between; }
  .sig-box { width: 220px; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 9pt; color: #555; }

  .print-btn { position: fixed; top: 16px; right: 16px; background: #1a3a6b; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; z-index: 999; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">ELECTRICAL MASTER</div>
      <div class="company-sub">SWITCHGEAR</div>
    </div>
    <div>
      <div class="doc-label">QUOTATION</div>
      <div class="doc-num">No: ${quotation.meta.quotationNumber}</div>
      <div class="doc-num">Date: ${quotation.meta.date}</div>
      <div class="doc-num">Valid Until: ${quotation.meta.validUntil}</div>
    </div>
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Bill To</h3>
      <div class="info-row"><span class="info-label">Customer:</span><span class="info-value">${quotation.contact.customerName}</span></div>
      <div class="info-row"><span class="info-label">Company:</span><span class="info-value">${quotation.contact.company}</span></div>
      ${quotation.contact.address ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${quotation.contact.address}</span></div>` : ""}
      ${quotation.contact.phone ? `<div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${quotation.contact.phone}</span></div>` : ""}
      ${quotation.contact.email ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${quotation.contact.email}</span></div>` : ""}
    </div>
    <div class="info-box">
      <h3>Project Details</h3>
      ${quotation.meta.project ? `<div class="info-row"><span class="info-label">Project:</span><span class="info-value">${quotation.meta.project}</span></div>` : ""}
      ${quotation.meta.reference ? `<div class="info-row"><span class="info-label">Reference:</span><span class="info-value">${quotation.meta.reference}</span></div>` : ""}
      <div class="info-row"><span class="info-label">Currency:</span><span class="info-value">${curr}</span></div>
      ${quotation.meta.paymentTerms ? `<div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${quotation.meta.paymentTerms}</span></div>` : ""}
      ${quotation.meta.deliveryTerms ? `<div class="info-row"><span class="info-label">Delivery:</span><span class="info-value">${quotation.meta.deliveryTerms}</span></div>` : ""}
    </div>
  </div>

  <!-- Products Table -->
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th style="width:110px">Code</th>
        <th style="width:90px">Brand</th>
        <th>Description</th>
        <th style="width:50px">Qty</th>
        <th style="width:100px">Unit Price</th>
        <th style="width:110px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <table class="totals-table">
      <tr class="subtotal">
        <td>Subtotal</td>
        <td>${fmt(quotation.subtotal)}</td>
      </tr>
      <tr class="gst">
        <td>GST (${Math.round(quotation.gstRate * 100)}%)</td>
        <td>${fmt(quotation.gstAmount)}</td>
      </tr>
      <tr class="grand">
        <td>TOTAL (${curr})</td>
        <td>${fmt(quotation.grandTotal)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer-sections">
    ${quotation.meta.notes ? `<div class="terms-box"><h3>Notes</h3>${quotation.meta.notes}</div>` : "<div></div>"}
    <div class="terms-box">
      <h3>Terms & Conditions</h3>
      ${quotation.meta.termsAndConditions}
    </div>
  </div>

  <div class="signature-area">
    <div class="sig-box">
      <div class="sig-line">Authorised Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Customer Acceptance</div>
    </div>
  </div>
</div>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="Quotation_${quotation.meta.quotationNumber}.html"`,
            },
        });
    } catch (err) {
        console.error("Quotation PDF error:", err);
        return NextResponse.json({ error: "Failed to generate quotation." }, { status: 500 });
    }
}

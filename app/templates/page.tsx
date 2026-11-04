"use client";

import { useState } from "react";
import { useEmsStore } from "@/stores/appStore";
import { nanoid, formatDate } from "@/lib/utils";
import type { UploadedTemplate, TemplateColumnMapping } from "@/lib/types";

const FIELD_OPTIONS = [
    { value: "item", label: "Item #" },
    { value: "description", label: "Description" },
    { value: "brand", label: "Brand" },
    { value: "quantity", label: "Quantity" },
    { value: "list_price", label: "List Price" },
    { value: "discount", label: "Discount" },
    { value: "net_cost", label: "Net Cost" },
    { value: "margin", label: "Margin" },
    { value: "selling_price", label: "Selling Price" },
    { value: "total_cost", label: "Total Cost" },
    { value: "total_selling", label: "Total Selling" },
    { value: "product_code", label: "Product Code" },
    { value: "unit_price", label: "Unit Price" },
    { value: "total", label: "Total" },
    { value: "ignore", label: "— Ignore —" },
];

export default function TemplatesPage() {
    const { costingTemplate, quotationTemplate, setCostingTemplate, setQuotationTemplate, clearTemplate } = useEmsStore();
    const [uploading, setUploading] = useState<"costing" | "quotation" | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [editMappings, setEditMappings] = useState<{ type: "costing" | "quotation"; mappings: TemplateColumnMapping[] } | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    const handleTemplateUpload = async (type: "costing" | "quotation", file: File) => {
        setUploading(type);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("brand", "");

        try {
            const res = await fetch("/api/price-lists/process", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) { showToast(`❌ ${data.error}`); return; }

            // Auto-map template columns
            const mappings: TemplateColumnMapping[] = data.headers.map((h: string, i: number) => {
                const mapped = data.mappings[i];
                let mappedTo = mapped?.mappedTo ?? "ignore";
                // Try to map to template-specific fields
                const hl = h.toLowerCase();
                if (hl.includes("item")) mappedTo = "item";
                if (hl.includes("qty") || hl.includes("quantity")) mappedTo = "quantity";
                if (hl.includes("unit price") || hl.includes("sell")) mappedTo = "selling_price";
                if (hl.includes("total")) mappedTo = "total";

                return {
                    excelColumn: String.fromCharCode(65 + i), // A, B, C...
                    excelHeader: h,
                    mappedTo,
                    confidence: mapped?.confidence ?? 0.5,
                };
            });

            const template: UploadedTemplate = {
                id: nanoid(),
                type,
                fileName: file.name,
                uploadDate: formatDate(),
                sheets: data.sheets,
                columnMappings: mappings,
                headerRow: 1,
                dataStartRow: 2,
                status: "pending_mapping",
            };

            if (type === "costing") setCostingTemplate(template);
            else setQuotationTemplate(template);

            setEditMappings({ type, mappings });
            showToast(`✅ ${type === "costing" ? "Costing" : "Quotation"} template uploaded`);
        } catch {
            showToast("❌ Upload failed");
        } finally {
            setUploading(null);
        }
    };

    const handleSaveMappings = () => {
        if (!editMappings) return;
        if (editMappings.type === "costing" && costingTemplate) {
            setCostingTemplate({ ...costingTemplate, columnMappings: editMappings.mappings, status: "mapped" });
        } else if (editMappings.type === "quotation" && quotationTemplate) {
            setQuotationTemplate({ ...quotationTemplate, columnMappings: editMappings.mappings, status: "mapped" });
        }
        setEditMappings(null);
        showToast("✅ Mappings saved");
    };

    return (
        <div style={{ padding: "28px 32px" }}>
            {toast && <div className="toast" style={{ borderLeft: "3px solid var(--success)" }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="section-title" style={{ fontSize: "22px" }}>📄 Templates</h1>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                        Upload your existing Excel templates to preserve formatting when generating outputs
                    </p>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "28px" }}>
                {/* Costing Template */}
                <TemplateCard
                    title="Costing Template"
                    icon="🧮"
                    template={costingTemplate}
                    uploading={uploading === "costing"}
                    onUpload={(file) => handleTemplateUpload("costing", file)}
                    onEdit={() => costingTemplate && setEditMappings({ type: "costing", mappings: costingTemplate.columnMappings })}
                    onClear={() => clearTemplate("costing")}
                    description="Upload your existing Excel costing sheet. The system will preserve its structure when generating outputs."
                />
                {/* Quotation Template */}
                <TemplateCard
                    title="Quotation Template"
                    icon="📃"
                    template={quotationTemplate}
                    uploading={uploading === "quotation"}
                    onUpload={(file) => handleTemplateUpload("quotation", file)}
                    onEdit={() => quotationTemplate && setEditMappings({ type: "quotation", mappings: quotationTemplate.columnMappings })}
                    onClear={() => clearTemplate("quotation")}
                    description="Upload your existing Excel quotation template. Customer-facing formatting will be preserved."
                />
            </div>

            {/* Column Mapping Editor */}
            {editMappings && (
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h2 className="section-title" style={{ fontSize: "16px" }}>
                                Column Mapping — {editMappings.type === "costing" ? "Costing" : "Quotation"} Template
                            </h2>
                            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "4px" }}>
                                Map each Excel column to the corresponding field. This tells the system where to write data.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-ghost btn-sm" onClick={() => setEditMappings(null)}>Cancel</button>
                            <button className="btn-primary btn-sm" onClick={handleSaveMappings}>Save Mappings</button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Excel Column</th>
                                    <th>Original Header</th>
                                    <th>Maps To</th>
                                    <th>Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editMappings.mappings.map((m, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{m.excelColumn}</td>
                                        <td style={{ color: "var(--muted)" }}>{m.excelHeader}</td>
                                        <td>
                                            <select
                                                className="select"
                                                value={m.mappedTo}
                                                style={{ fontSize: "12px", padding: "4px 8px" }}
                                                onChange={(e) => {
                                                    const updated = [...editMappings.mappings];
                                                    updated[i] = { ...m, mappedTo: e.target.value };
                                                    setEditMappings({ ...editMappings, mappings: updated });
                                                }}
                                            >
                                                {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <span className={`badge ${m.confidence >= 0.8 ? "badge-green" : m.confidence >= 0.5 ? "badge-yellow" : "badge-gray"}`}>
                                                {Math.round(m.confidence * 100)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info about template usage */}
            <div className="card" style={{ marginTop: "20px", background: "rgba(61,126,255,0.06)", border: "1px solid rgba(61,126,255,0.2)" }}>
                <h3 style={{ fontWeight: 600, fontSize: "14px", marginBottom: "10px", color: "var(--accent)" }}>
                    ℹ️ How Templates Work
                </h3>
                <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.7 }}>
                    Upload your existing Excel costing or quotation sheet. The system analyzes the column structure and header names.
                    When you generate a costing or quotation, the output will follow the same column order and can preserve your formatting.
                    <br /><br />
                    For the MVP, templates are used to define column order. Full template formatting preservation (merged cells, formulas, styles)
                    will be available in the database-enabled version.
                </p>
            </div>
        </div>
    );
}

function TemplateCard({ title, icon, template, uploading, onUpload, onEdit, onClear, description }: {
    title: string;
    icon: string;
    template: UploadedTemplate | null;
    uploading: boolean;
    onUpload: (f: File) => void;
    onEdit: () => void;
    onClear: () => void;
    description: string;
}) {
    const [dragging, setDragging] = useState(false);

    const handleFile = (file: File | null) => {
        if (!file) return;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext || "")) { alert("Only XLSX, XLS, CSV files supported"); return; }
        if (file.size > 50 * 1024 * 1024) { alert("File too large. Max 50MB."); return; }
        onUpload(file);
    };

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{icon} {title}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>{description}</div>
                </div>
                {template && (
                    <span className={`badge ${template.status === "ready" || template.status === "mapped" ? "badge-green" : "badge-yellow"}`}>
                        {template.status}
                    </span>
                )}
            </div>

            {template ? (
                <div style={{ background: "var(--muted-bg)", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>{template.fileName}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        Uploaded: {template.uploadDate} · {template.columnMappings.length} columns mapped
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button className="btn-secondary btn-sm" onClick={onEdit}>Edit Mappings</button>
                        <button className="btn-danger btn-sm" onClick={onClear}>Remove</button>
                    </div>
                </div>
            ) : (
                <label
                    className={`drop-zone ${dragging ? "active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                >
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>{uploading ? "⏳" : icon}</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {uploading ? "Analyzing template…" : "Drop your template here or click to upload"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>XLSX · XLS · CSV</div>
                    {uploading && <div className="spinner" style={{ margin: "12px auto 0" }} />}
                </label>
            )}
        </div>
    );
}

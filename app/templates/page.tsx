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
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
            {toast && (
                <div className="toast border-l-4 border-emerald-500 shadow-md">
                    {toast}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>📄</span> Templates
                    </h1>
                    <p className="text-xs sm:text-sm text-muted mt-1">
                        Upload your existing Excel templates to preserve formatting when generating outputs
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="card space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                        <div>
                            <h2 className="text-base font-bold text-foreground">
                                Column Mapping — {editMappings.type === "costing" ? "Costing" : "Quotation"} Template
                            </h2>
                            <p className="text-xs text-muted mt-1">
                                Map each Excel column to the corresponding field. This tells the system where to write data.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => setEditMappings(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={handleSaveMappings}
                            >
                                Save Mappings
                            </button>
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
                                    <tr key={i} className="hover:bg-muted-bg/50 transition-colors">
                                        <td className="font-bold text-blue-600 dark:text-blue-400 font-mono">{m.excelColumn}</td>
                                        <td className="text-muted">{m.excelHeader}</td>
                                        <td>
                                            <label htmlFor={`map-field-${i}`} className="sr-only">Map field for {m.excelHeader}</label>
                                            <select
                                                id={`map-field-${i}`}
                                                className="select text-xs py-1 px-2.5"
                                                value={m.mappedTo}
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
            <div className="card bg-blue-500/5 border border-blue-500/20 p-5 space-y-2">
                <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>ℹ️</span> How Templates Work
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                    Upload your existing Excel costing or quotation sheet. The system analyzes the column structure and header names.
                    When you generate a costing or quotation, the output will follow the same column order and can preserve your formatting.
                </p>
                <p className="text-xs text-muted leading-relaxed">
                    Templates define the target column mapping and layout structure to match your organization&apos;s quotation format.
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
        <div className="card space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <div className="font-bold text-base text-foreground flex items-center gap-1.5">
                        <span>{icon}</span> {title}
                    </div>
                    <div className="text-xs text-muted mt-1">{description}</div>
                </div>
                {template && (
                    <span className={`badge ${template.status === "ready" || template.status === "mapped" ? "badge-green" : "badge-yellow"}`}>
                        {template.status}
                    </span>
                )}
            </div>

            {template ? (
                <div className="p-3 rounded-lg bg-muted-bg/60 border border-border space-y-2">
                    <div className="font-semibold text-sm text-foreground">{template.fileName}</div>
                    <div className="text-xs text-muted">
                        Uploaded: {template.uploadDate} · {template.columnMappings.length} columns mapped
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" className="btn-secondary btn-sm" onClick={onEdit}>Edit Mappings</button>
                        <button type="button" className="btn-danger btn-sm" onClick={onClear}>Remove</button>
                    </div>
                </div>
            ) : (
                <label
                    className={`drop-zone group flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                        dragging
                            ? "border-blue-600 bg-blue-600/10"
                            : "border-border hover:border-blue-500 bg-muted-bg/30 hover:bg-muted-bg/60"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                >
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{uploading ? "⏳" : icon}</div>
                    <div className="text-xs font-semibold text-foreground">
                        {uploading ? "Analyzing template…" : "Drop your template here or click to upload"}
                    </div>
                    <div className="text-[11px] text-muted mt-1">XLSX · XLS · CSV</div>
                </label>
            )}
        </div>
    );
}

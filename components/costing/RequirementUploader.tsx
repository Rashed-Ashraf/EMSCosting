"use client";

import { useState } from "react";
import type { BOQItem } from "@/lib/types";

interface RequirementUploaderProps {
    onItemsLoaded: (items: BOQItem[], fileName: string) => void;
    showToast: (msg: string) => void;
}

const ALLOWED_EXTS = ["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg", "webp"];

export default function RequirementUploader({
    onItemsLoaded,
    showToast,
}: RequirementUploaderProps) {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (file: File | null) => {
        if (!file) return;

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ALLOWED_EXTS.includes(ext || "")) {
            showToast("❌ Please upload Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), or Image (.png, .jpg, .webp)");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            showToast("❌ File too large. Max 50MB.");
            return;
        }

        setUploading(true);
        showToast("⏳ Processing requirement document & extracting specs...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/boq/process", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                showToast(`❌ ${data.error || "Failed to process file"}`);
                return;
            }

            const items: BOQItem[] = data.items || [];
            if (items.length === 0) {
                showToast("⚠️ No electrical requirement items detected in this file.");
                return;
            }

            showToast(`✅ ${items.length} requirement items extracted from ${file.name}`);
            onItemsLoaded(items, file.name);
        } catch {
            showToast("❌ Failed to process requirement file.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ position: "relative" }}>
            <label
                className={`drop-zone ${dragging ? "active" : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files[0] || null);
                }}
                style={{
                    cursor: uploading ? "wait" : "pointer",
                    padding: "16px 20px",
                    border: "1.5px dashed var(--accent)",
                    background: dragging ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.04)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    transition: "all 0.2s ease",
                }}
            >
                <input
                    id="requirement-file-upload-input"
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "rgba(59, 130, 246, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            flexShrink: 0,
                        }}
                    >
                        {uploading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : "📥"}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                            {uploading ? "Analyzing & Extracting Requirements…" : "Upload Requirement / BOQ File"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                            Drag & drop or click to upload · <strong>Excel, CSV, PDF, or Images</strong> (PNG, JPG, WEBP)
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                    <span className="badge badge-purple" style={{ fontSize: "11px" }}>Auto Spec Extraction</span>
                    <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={uploading}
                        style={{ pointerEvents: "none" }}
                    >
                        Browse File
                    </button>
                </div>
            </label>
        </div>
    );
}

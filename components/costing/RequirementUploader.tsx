"use client";

import { useState } from "react";
import type { BOQItem } from "@/lib/types";
import { ProcessingProgressCard, TableSkeleton, useProcessingProgress } from "@/components/common/ProcessingProgress";

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
    const [currentFileName, setCurrentFileName] = useState<string>("");

    const { progress, stageIndex } = useProcessingProgress(uploading, 10);

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

        setCurrentFileName(file.name);
        setUploading(true);
        showToast("⏳ Processing requirement document with OCR & AI Vision...");

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
            setCurrentFileName("");
        }
    };

    return (
        <div className="space-y-4">
            {uploading ? (
                <div className="space-y-3">
                    <ProcessingProgressCard
                        title="Analyzing Requirement & Running OCR"
                        fileName={currentFileName}
                        progress={progress}
                        stageIndex={stageIndex}
                    />
                    <TableSkeleton rows={4} columns={6} />
                </div>
            ) : (
                <label
                    className={`drop-zone group relative flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border-2 border-dashed p-4 sm:p-5 transition-all cursor-pointer ${
                        dragging
                            ? "border-accent bg-accent/10 scale-[1.005]"
                            : "border-border hover:border-accent/80 bg-muted-bg/40 hover:bg-muted-bg/80"
                    }`}
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
                >
                    <input
                        id="requirement-file-upload-input"
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl text-accent group-hover:scale-105 transition-transform">
                            📥
                        </div>
                        <div>
                            <div className="text-sm font-bold text-foreground">
                                Upload Requirement / BOQ File
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                                Drag & drop or click to upload · <strong className="text-foreground">Excel, CSV, PDF, or Images</strong> (PNG, JPG, WEBP)
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="badge badge-blue text-[11px]">
                            Auto Spec Extraction
                        </span>
                        <span className="btn-primary btn-sm pointer-events-none">
                            Browse File
                        </span>
                    </div>
                </label>
            )}
        </div>
    );
}

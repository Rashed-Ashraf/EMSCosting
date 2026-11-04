// =============================================================================
// API: Process BOQ / Requirement File
// POST /api/boq/process
// Supports: Excel (XLSX, XLS), CSV, PDF (.pdf), and Images (.png, .jpg, .webp)
// Returns: { items: BOQItem[], totalItems: number, fileName: string, fileType: string }
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { processRequirementDocument } from "@/lib/parsers/requirementParser";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg", "webp", "bmp", "tiff"];

        if (!allowedExtensions.includes(ext || "")) {
            return NextResponse.json(
                { error: `Unsupported file type (.${ext}). Supported formats: Excel, CSV, PDF, and Images (PNG, JPG, WEBP).` },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await processRequirementDocument(buffer, file.name);

        return NextResponse.json(result);
    } catch (err: unknown) {
        console.error("Requirement process error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to process requirement file.";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

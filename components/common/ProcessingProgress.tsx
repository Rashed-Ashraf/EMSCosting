"use client";

import { useEffect, useState } from "react";

export interface ProcessingStep {
    label: string;
    description?: string;
}

const DEFAULT_OCR_STEPS: ProcessingStep[] = [
    { label: "Uploading file", description: "Transferring document to processing engine" },
    { label: "Document analysis", description: "Detecting layout, pages, and format" },
    { label: "AI Vision & OCR", description: "Extracting text, tables, and specifications" },
    { label: "Catalog structuring", description: "Parsing codes, ratings, and quantities" },
];

/**
 * Hook to simulate progressive stages during asynchronous AI & OCR parsing.
 */
export function useProcessingProgress(isProcessing: boolean, totalExpectedSeconds = 12) {
    const [progress, setProgress] = useState(0);
    const [stageIndex, setStageIndex] = useState(0);

    useEffect(() => {
        if (!isProcessing) {
            setProgress(0);
            setStageIndex(0);
            return;
        }

        // Immediately start with initial progress
        setProgress(8);
        setStageIndex(0);

        const startTime = Date.now();
        const durationMs = totalExpectedSeconds * 1000;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const ratio = Math.min(elapsed / durationMs, 0.95); // asymptote at 95% until complete
            
            // Non-linear easing for natural feel
            const currentPct = Math.round(10 + Math.pow(ratio, 0.7) * 85);
            setProgress(currentPct);

            if (currentPct < 25) {
                setStageIndex(0);
            } else if (currentPct < 55) {
                setStageIndex(1);
            } else if (currentPct < 85) {
                setStageIndex(2);
            } else {
                setStageIndex(3);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [isProcessing, totalExpectedSeconds]);

    return { progress, stageIndex };
}

/**
 * Detailed progress indicator with stages, percent counter, and engine status pill.
 */
export function ProcessingProgressCard({
    title = "Processing Document with AI / OCR",
    fileName,
    progress,
    stageIndex,
    steps = DEFAULT_OCR_STEPS,
}: {
    title?: string;
    fileName?: string;
    progress: number;
    stageIndex: number;
    steps?: ProcessingStep[];
}) {
    const currentStep = steps[stageIndex] || steps[steps.length - 1];

    return (
        <div className="w-full rounded-xl border border-border bg-card-bg p-5 shadow-sm transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <span className="text-xl animate-spin">⚡</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {title}
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                                OCR Engine Active
                            </span>
                        </h4>
                        {fileName && (
                            <p className="text-xs text-muted truncate max-w-xs sm:max-w-md">
                                File: <span className="font-medium text-foreground">{fileName}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-lg font-bold text-accent tracking-tight">
                        {progress}%
                    </div>
                    <div className="text-[11px] text-muted">
                        {currentStep.label}
                    </div>
                </div>
            </div>

            {/* Progress Track & Animated Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted-bg border border-border/60">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                />
            </div>

            {/* Step badges */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {steps.map((step, idx) => {
                    const isDone = idx < stageIndex;
                    const isActive = idx === stageIndex;
                    return (
                        <div
                            key={step.label}
                            className={`rounded-lg border p-2.5 transition-all text-xs ${
                                isActive
                                    ? "border-accent/40 bg-accent/5 text-foreground shadow-xs"
                                    : isDone
                                    ? "border-border/60 bg-muted-bg/50 text-muted"
                                    : "border-transparent bg-muted-bg/30 text-muted/60"
                            }`}
                        >
                            <div className="flex items-center gap-1.5 font-medium">
                                <span>{isDone ? "✓" : isActive ? "⏳" : "○"}</span>
                                <span className={isActive ? "text-accent font-semibold" : ""}>{step.label}</span>
                            </div>
                            {step.description && (
                                <p className="mt-1 text-[10px] text-muted line-clamp-1">{step.description}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Skeleton loader for tabular data (e.g. while extracting items from BOQ or Price List).
 */
export function TableSkeleton({
    rows = 5,
    columns = 6,
    className = "",
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={`w-full overflow-hidden rounded-xl border border-border bg-card-bg ${className}`}>
            {/* Header skeleton */}
            <div className="flex items-center gap-4 border-b border-border bg-muted-bg px-4 py-3">
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={i}
                        className="h-3.5 rounded bg-muted/20 animate-pulse"
                        style={{ width: i === 0 ? "28px" : i === 1 ? "120px" : "80px" }}
                    />
                ))}
            </div>

            {/* Row skeletons */}
            <div className="divide-y divide-border/60">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center gap-4 px-4 py-3.5">
                        {Array.from({ length: columns }).map((_, c) => {
                            const widths = ["w-6", "w-32", "w-20", "w-48", "w-16", "w-24"];
                            return (
                                <div
                                    key={c}
                                    className={`h-4 rounded bg-muted/15 animate-pulse ${
                                        widths[c % widths.length]
                                    }`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton loader for card items (e.g. BOQ Match Cards, Product cards).
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card-bg p-4 animate-pulse"
                >
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-16 rounded bg-muted/20" />
                            <div className="h-5 w-24 rounded bg-muted/20" />
                            <div className="h-5 w-12 rounded bg-muted/15" />
                        </div>
                        <div className="h-4 w-3/4 rounded bg-muted/20" />
                        <div className="h-3.5 w-1/2 rounded bg-muted/15" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-20 rounded bg-muted/20" />
                        <div className="h-8 w-24 rounded bg-muted/25" />
                    </div>
                </div>
            ))}
        </div>
    );
}

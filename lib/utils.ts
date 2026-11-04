// =============================================================================
// ELECTRICAL MASTER — Utility Functions
// =============================================================================

/**
 * Generate a simple unique ID
 */
export function nanoid(length = 10): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
}

/**
 * Format a date for display
 */
export function formatDateDisplay(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

/**
 * Generate a quotation number
 */
export function generateQuotationNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const rand = Math.floor(Math.random() * 90000) + 10000;
    return `EM-${year}-${rand}`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Debounce a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Parse a percentage string to decimal (e.g. "35%" → 0.35)
 */
export function parsePercent(value: string | number): number {
    if (typeof value === "number") {
        // If already decimal (e.g. 0.35) return as-is, if integer (35) convert
        return value > 1 ? value / 100 : value;
    }
    const cleaned = String(value).replace("%", "").trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num > 1 ? num / 100 : num;
}

/**
 * Safely parse a float from various input types
 */
export function parsePrice(value: unknown): number {
    if (typeof value === "number") return isNaN(value) ? 0 : value;
    if (value === null || value === undefined || value === "") return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Truncate a string
 */
export function truncate(str: string, maxLen = 60): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
}

/**
 * File size formatting
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates whether a string looks like a legitimate electrical brand name.
 * Rejects pure numbers (e.g. "150", "500", "06"), ratings ("150 Amps", "500V"),
 * ratios ("150/5"), units ("EA", "PCS"), or generic status tokens.
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


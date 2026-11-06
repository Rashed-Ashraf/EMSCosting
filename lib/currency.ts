// =============================================================================
// ELECTRICAL MASTER — Currency & Pakistan Tax (GST) Standardization
// =============================================================================

export const DEFAULT_CURRENCY = "PKR" as const;
export const DEFAULT_GST_RATE = 0.18 as const; // 18% standard Pakistan sales tax

export const SUPPORTED_CURRENCIES = [
    "PKR",
    "USD",
    "EUR",
    "AED",
    "SAR",
    "GBP",
    "AUD",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface GstRateOption {
    label: string;
    value: number;
}

export const GST_RATE_OPTIONS: GstRateOption[] = [
    { label: "18% (Pakistan Standard Sales Tax)", value: 0.18 },
    { label: "17% (Pakistan Prior / Reduced)", value: 0.17 },
    { label: "0% (Exempt / No Tax)", value: 0 },
    { label: "5% (Special Concession)", value: 0.05 },
    { label: "10% (Special Service / WHT)", value: 0.1 },
];

/**
 * Formats a number as a standardized currency string, defaulting strictly to Pakistani Rupees (PKR).
 * Uses Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }) for PKR.
 */
export function formatCurrency(
    value: number,
    currency: string = DEFAULT_CURRENCY,
    decimals: number = 0
): string {
    const val = typeof value === "number" && !isNaN(value) ? value : 0;
    const curr = (currency || DEFAULT_CURRENCY).trim().toUpperCase();

    // Primary Pakistani Rupee formatting
    if (curr === "PKR" || curr === "RS" || curr === "RS.") {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(val);
    }

    // Standard International currency formatting
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: curr,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(val);
    } catch {
        // Fallback for custom or unrecognized currency tokens
        const formattedNumber = new Intl.NumberFormat("en-PK", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(val);
        return `${curr} ${formattedNumber}`;
    }
}

/**
 * Calculates GST amount rounded to 2 decimal places.
 * Defaults to Pakistan's 18% GST.
 */
export function calculateGST(
    subtotal: number,
    gstRate: number = DEFAULT_GST_RATE
): number {
    const rate = typeof gstRate === "number" && !isNaN(gstRate) ? gstRate : DEFAULT_GST_RATE;
    return Math.round(subtotal * rate * 100) / 100;
}

/**
 * Calculates both GST and Grand Total from a subtotal selling amount.
 */
export function calculateGrandTotal(
    subtotalSelling: number,
    gstRate: number = DEFAULT_GST_RATE
): { gstAmount: number; grandTotal: number } {
    const gstAmount = calculateGST(subtotalSelling, gstRate);
    const grandTotal = Math.round((subtotalSelling + gstAmount) * 100) / 100;
    return { gstAmount, grandTotal };
}


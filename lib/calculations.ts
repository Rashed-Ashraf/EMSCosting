// =============================================================================
// ELECTRICAL MASTER — Pure Financial Calculation Engine
// IMPORTANT: Never use AI for any calculations in this module.
// =============================================================================

import type { CostingItem, CostingTotals, CostingSession, Product } from "./types";
import { nanoid } from "./utils";
import {
    DEFAULT_CURRENCY,
    DEFAULT_GST_RATE,
    formatCurrency,
    calculateGST,
    calculateGrandTotal,
    GST_RATE_OPTIONS,
    SUPPORTED_CURRENCIES,
} from "./currency";

export {
    DEFAULT_CURRENCY,
    DEFAULT_GST_RATE,
    formatCurrency,
    calculateGST,
    calculateGrandTotal,
    GST_RATE_OPTIONS,
    SUPPORTED_CURRENCIES,
};

/**
 * Calculate net cost from list price and discount
 */
export function calcNetCost(listPrice: number, discount: number): number {
    return round2(listPrice * (1 - discount));
}

/**
 * Calculate selling price from net cost and margin
 */
export function calcSellingPrice(netCost: number, margin: number): number {
    return round2(netCost * (1 + margin));
}

/**
 * Calculate total cost
 */
export function calcTotalCost(netCost: number, qty: number): number {
    return round2(netCost * qty);
}

/**
 * Calculate total selling price
 */
export function calcTotalSelling(sellingPrice: number, qty: number): number {
    return round2(sellingPrice * qty);
}

/**
 * Recalculate all derived fields for a costing item
 */
export function recalcItem(item: CostingItem): CostingItem {
    const netCost = calcNetCost(item.listPrice, item.discount);
    const sellingPrice = calcSellingPrice(netCost, item.margin);
    const totalCost = calcTotalCost(netCost, item.qty);
    const totalSelling = calcTotalSelling(sellingPrice, item.qty);
    return { ...item, netCost, sellingPrice, totalCost, totalSelling };
}

/**
 * Recalculate all session totals
 */
export function calcTotals(
    items: CostingItem[],
    gstRate: number = DEFAULT_GST_RATE
): CostingTotals {
    const subtotalCost = round2(items.reduce((s, i) => s + i.totalCost, 0));
    const subtotalSelling = round2(items.reduce((s, i) => s + i.totalSelling, 0));
    const gstAmount = round2(subtotalSelling * gstRate);
    const grandTotal = round2(subtotalSelling + gstAmount);
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const averageMargin =
        items.length > 0
            ? round2(items.reduce((s, i) => s + i.margin, 0) / items.length)
            : 0;

    return {
        subtotalCost,
        subtotalSelling,
        gstAmount,
        grandTotal,
        totalItems: items.length,
        totalQty,
        averageMargin,
    };
}

/**
 * Create a new CostingItem from a product with defaults
 */
export function createCostingItem(
    product: Product,
    overrides?: Partial<CostingItem>
): CostingItem {
    const listPrice = product.listPrice;
    const discount = product.discount;
    const margin = 0.15; // default 15% margin
    const netCost = calcNetCost(listPrice, discount);
    const sellingPrice = calcSellingPrice(netCost, margin);
    const qty = 1;

    return recalcItem({
        id: nanoid(),
        lineNo: 1,
        product,
        qty,
        listPrice,
        discount,
        netCost,
        margin,
        sellingPrice,
        totalCost: calcTotalCost(netCost, qty),
        totalSelling: calcTotalSelling(sellingPrice, qty),
        ...overrides,
    });
}

/**
 * Format a decimal as a percentage string
 */
export function formatPercent(value: number, decimals = 1): string {
    return (value * 100).toFixed(decimals) + "%";
}

/**
 * Round to 2 decimal places
 */
export function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

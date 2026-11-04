// =============================================================================
// ELECTRICAL MASTER — Blind Quotation & Electrical Spec Search Engine
// Handles RFQs / BOQ items where model number is omitted, but Brand and
// Electrical Readings (Current/Amps, Poles, kA, Voltage, Component Type) are given.
// =============================================================================

import type { Product } from "../types";

export interface ParsedElectricalSpec {
    brand?: string;
    componentType?: string;
    currentRating?: string;      // e.g. "250A", "63A"
    currentNumeric?: number;     // e.g. 250, 63
    poles?: string;              // e.g. "3P", "4P", "1P", "2P"
    breakingCapacity?: string;   // e.g. "36kA", "50kA", "10kA"
    breakingCapacityNumeric?: number; // e.g. 36, 50, 10
    voltage?: string;            // e.g. "415V", "240V", "230VAC", "24VDC"
    powerRating?: string;        // e.g. "15kW", "7.5kW", "25kVAR"
    powerNumeric?: number;       // e.g. 15, 7.5
    curve?: string;              // e.g. "Curve C", "Curve D", "Curve B"
    keywords: string[];          // remaining descriptive tokens
}

export interface BlindSpecMatchDetails {
    brandMatch: boolean;
    typeMatch: boolean;
    currentMatch: boolean;
    polesMatch: boolean;
    breakingCapacityMatch: boolean;
    voltageMatch: boolean;
    powerMatch: boolean;
    matchedFeatures: string[];
    missingFeatures: string[];
}

export interface BlindQuotationResult {
    product: Product;
    score: number; // 0 to 1
    matchDetails: BlindSpecMatchDetails;
    matchedSpecsSummary: string;
}

export interface BlindSearchFilters {
    brand?: string;
    componentType?: string;
    currentRating?: string;
    poles?: string;
    breakingCapacity?: string;
    voltage?: string;
    powerRating?: string;
    minPrice?: number;
    maxPrice?: number;
    query?: string;
}

// ─── Component Type Synonyms & Patterns ────────────────────────────────────────

const COMPONENT_TYPES: { type: string; label: string; patterns: RegExp[]; synonyms: string[] }[] = [
    {
        type: "MCCB",
        label: "MCCB (Moulded Case Circuit Breaker)",
        patterns: [/\bmccb\b/i, /\bmoulded\s*case\b/i, /\bmolded\s*case\b/i, /\bnsx\b/i, /\bcompmact\b/i, /\bformula\b/i, /\bxt\d\b/i, /\b3va\b/i, /\bh3\b/i, /\bdp\d\b/i],
        synonyms: ["mccb", "moulded case", "molded case", "circuit breaker", "breaker", "nsx", "tmax", "3va"],
    },
    {
        type: "MCB",
        label: "MCB (Miniature Circuit Breaker)",
        patterns: [/\bmcb\b/i, /\bminiature\s*circuit\s*breaker\b/i, /\bic60\b/i, /\bik60\b/i, /\bs200\b/i, /\b5sl\b/i, /\b5sy\b/i, /\bmb\d\b/i, /\bhager\s*m\b/i],
        synonyms: ["mcb", "miniature circuit breaker", "ic60", "s200", "5sy", "5sl"],
    },
    {
        type: "ACB",
        label: "ACB (Air Circuit Breaker)",
        patterns: [/\bacb\b/i, /\bair\s*circuit\s*breaker\b/i, /\bmasterpact\b/i, /\bemax\b/i, /\b3wl\b/i, /\b3wa\b/i],
        synonyms: ["acb", "air circuit breaker", "masterpact", "emax"],
    },
    {
        type: "CONTACTOR",
        label: "Contactor",
        patterns: [/\bcontactor\b/i, /\bmagnetic\s*contactor\b/i, /\blc1d\b/i, /\blc1e\b/i, /\blc1f\b/i, /\baf\d{2,}\b/i, /\b3rt\b/i, /\bdil\s*m\b/i],
        synonyms: ["contactor", "magnetic contactor", "lc1d", "lc1f", "3rt", "af09", "af16", "af26", "af30", "af38", "af40", "af52", "af65", "af80", "af96"],
    },
    {
        type: "OVERLOAD_RELAY",
        label: "Thermal Overload Relay (TOR)",
        patterns: [/\boverload\b/i, /\bthermal\s*overload\b/i, /\btor\b/i, /\blrd\b/i, /\blre\b/i, /\btf\d+\b/i, /\b3ru\b/i, /\bthermal\s*relay\b/i],
        synonyms: ["overload", "thermal overload", "tor", "lrd", "3ru", "tf42"],
    },
    {
        type: "MPCB",
        label: "MPCB (Motor Protection Circuit Breaker)",
        patterns: [/\bmpcb\b/i, /\bmotor\s*protection\b/i, /\bmotor\s*starter\b/i, /\bgv2\b/i, /\bgv3\b/i, /\bms116\b/i, /\bms132\b/i, /\b3rv\b/i],
        synonyms: ["mpcb", "motor circuit breaker", "motor protection", "gv2", "gv3", "ms116", "ms132", "3rv"],
    },
    {
        type: "RCCB",
        label: "RCCB / RCD / ELCB",
        patterns: [/\brccb\b/i, /\brcd\b/i, /\belcb\b/i, /\bresidual\s*current\b/i, /\biid\b/i, /\bf200\b/i, /\b5sv\b/i],
        synonyms: ["rccb", "rcd", "elcb", "residual current", "earth leakage"],
    },
    {
        type: "RCBO",
        label: "RCBO",
        patterns: [/\brcbo\b/i, /\biigi\b/i, /\bds201\b/i, /\b5su\b/i],
        synonyms: ["rcbo", "rcbo breaker"],
    },
    {
        type: "ISOLATOR",
        label: "Isolator / Switch Disconnector",
        patterns: [/\bisolator\b/i, /\bdisconnector\b/i, /\bswitch\s*disconnector\b/i, /\bload\s*break\b/i, /\bins\b/i, /\bot\d+\b/i, /\b3ld\b/i],
        synonyms: ["isolator", "disconnector", "switch disconnector", "load break switch", "main switch"],
    },
    {
        type: "VFD",
        label: "VFD / Inverter / Drive",
        patterns: [/\bvfd\b/i, /\binverter\b/i, /\bdrive\b/i, /\baltivar\b/i, /\batv\d+\b/i, /\bacs\d+\b/i, /\bsinamics\b/i, /\bg120\b/i],
        synonyms: ["vfd", "variable speed drive", "inverter", "frequency drive", "altivar", "acs", "sinamics"],
    },
    {
        type: "SOFT_STARTER",
        label: "Soft Starter",
        patterns: [/\bsoft\s*starter\b/i, /\bsoftstarter\b/i, /\bats\d+\b/i, /\bpstx\b/i, /\bpse\b/i, /\bpsr\b/i, /\b3rw\b/i],
        synonyms: ["soft starter", "softstarter", "ats48", "ats22", "3rw40", "3rw52"],
    },
    {
        type: "SPD",
        label: "Surge Arrester / SPD",
        patterns: [/\bspd\b/i, /\bsurge\b/i, /\blightning\s*arrester\b/i, /\bsurge\s*protective\b/i, /\bovr\b/i, /\biPRD\b/i],
        synonyms: ["spd", "surge arrester", "surge protection", "lightning arrester"],
    },
    {
        type: "CAPACITOR",
        label: "Power Factor Capacitor",
        patterns: [/\bcapacitor\b/i, /\bpfc\b/i, /\bvarplus\b/i, /\bphasecap\b/i, /\bkvar\b/i],
        synonyms: ["capacitor", "pfc", "power factor capacitor", "kvar"],
    },
    {
        type: "METER",
        label: "Energy / Multifunction Meter",
        patterns: [/\bmeter\b/i, /\bmfm\b/i, /\bmultifunction\s*meter\b/i, /\benergy\s*meter\b/i, /\bpowerlogic\b/i, /\bpm\d{3,}\b/i, /\bm2m\b/i, /\b7km\b/i, /\bammeter\b/i, /\bvoltmeter\b/i],
        synonyms: ["meter", "mfm", "energy meter", "power meter", "digital meter", "powerlogic", "multimeter"],
    },
    {
        type: "CT",
        label: "Current Transformer (CT)",
        patterns: [/\bct\b/i, /\bcurrent\s*transformer\b/i, /\btransformer\b/i],
        synonyms: ["ct", "current transformer"],
    },
    {
        type: "FUSE",
        label: "Fuse / Fuse Link",
        patterns: [/\bfuse\b/i, /\bhrc\s*fuse\b/i, /\bfuse\s*link\b/i, /\bnh\d\b/i],
        synonyms: ["fuse", "hrc fuse", "fuse link", "nh00", "nh1", "nh2"],
    },
    {
        type: "RELAY",
        label: "Control Relay / Timer",
        patterns: [/\bcontrol\s*relay\b/i, /\btimer\b/i, /\btime\s*relay\b/i, /\bzelio\b/i, /\bfinder\b/i],
        synonyms: ["relay", "timer", "control relay", "time delay relay"],
    },
];

const KNOWN_BRANDS = [
    { name: "Schneider Electric", aliases: ["schneider", "schneider electric", "square d", "merlin gerin", "telemecanique"] },
    { name: "ABB", aliases: ["abb", "asea brown boveri"] },
    { name: "Siemens", aliases: ["siemens"] },
    { name: "Legrand", aliases: ["legrand"] },
    { name: "Hager", aliases: ["hager"] },
    { name: "Clipsal", aliases: ["clipsal"] },
    { name: "Eaton", aliases: ["eaton", "moeller", "cutler hammer"] },
    { name: "Chint", aliases: ["chint"] },
    { name: "LS Electric", aliases: ["ls electric", "ls", "lg industrial"] },
    { name: "Mitsubishi", aliases: ["mitsubishi", "mitsubishi electric"] },
    { name: "Fuji", aliases: ["fuji", "fuji electric"] },
    { name: "Terasaki", aliases: ["terasaki"] },
    { name: "Hyundai", aliases: ["hyundai", "hyundai electric"] },
    { name: "Tence", aliases: ["tence", "tence electronic"] },
    { name: "ITL", aliases: ["itl", "instrument transformers", "instrument transformers limited"] },
    { name: "Mouua", aliases: ["mouua", "monua"] },
    { name: "Himel", aliases: ["himel"] },
    { name: "Socomec", aliases: ["socomec"] },
    { name: "Lovato", aliases: ["lovato", "lovato electric"] },
    { name: "Finder", aliases: ["finder"] },
    { name: "Omron", aliases: ["omron"] },
    { name: "Phoenix Contact", aliases: ["phoenix contact", "phoenix"] },
    { name: "Weidmuller", aliases: ["weidmuller", "weidmüller"] },
    { name: "Wago", aliases: ["wago"] },
    { name: "Danfoss", aliases: ["danfoss"] },
    { name: "Delta", aliases: ["delta", "delta electronics"] },
    { name: "Havells", aliases: ["havells"] },
    { name: "L&T", aliases: ["l&t", "larsen & toubro", "larsen and toubro"] },
    { name: "C&S Electric", aliases: ["c&s", "c&s electric"] },
];

/**
 * Parses free text (from client inquiry, BOQ line, or search box) into structured electrical specifications.
 */
export function parseElectricalQuery(query: string): ParsedElectricalSpec {
    const raw = query.trim();
    if (!raw) {
        return { keywords: [] };
    }

    const lower = raw.toLowerCase();
    const result: ParsedElectricalSpec = {
        keywords: [],
    };

    // 1. Detect Brand
    for (const b of KNOWN_BRANDS) {
        for (const alias of b.aliases) {
            const regex = new RegExp(`\\b${alias}\\b`, "i");
            if (regex.test(lower)) {
                result.brand = b.name;
                break;
            }
        }
        if (result.brand) break;
    }

    // 2. Detect Component Type
    for (const comp of COMPONENT_TYPES) {
        if (comp.patterns.some((p) => p.test(lower))) {
            result.componentType = comp.type;
            break;
        }
    }

    // 3. Detect Current / Amperage (e.g. 250A, 250 A, 250Amp, 250 Amps, 63A, 1600A, or CT ratio 150/5A, 150 / 05 Amps)
    // Check for Current Transformer ratio (e.g. "150 / 05 Amps", "150/5A", "200/5A")
    const ctMatch = raw.match(/\b(\d+)\s*[\/:]\s*(\d+)\s*(?:a|amp|amps|amperes)?\b/i);
    if (ctMatch) {
        const prim = parseInt(ctMatch[1], 10);
        const sec = parseInt(ctMatch[2], 10);
        result.currentNumeric = prim;
        result.currentRating = `${prim}/${sec}A`;
        if (!result.componentType) {
            result.componentType = "CT";
        }
    } else {
        // Avoid matching kA or kVAR or kW or V as Amps
        const currentMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*(?:a|amp|amps|amperes)\b(?!\s*ka)(?!\s*kvar)(?!\s*kw)/i);
        if (currentMatch) {
            const num = parseFloat(currentMatch[1]);
            result.currentNumeric = num;
            result.currentRating = `${num}A`;
        }
    }

    // 4. Detect Poles (1P, 2P, 3P, 4P, 1 Pole, 2 Pole, 3 Pole, 4 Pole, TPN, SPN, 3 Phase, 3P+N)
    if (/\b(?:4\s*[-–]?\s*p|4\s*[-–]?\s*pole|4\s*[-–]?\s*poles|4p|tpn|3p\+n|3p\s*\+\s*n|four\s*pole|quad\s*pole)\b/i.test(lower)) {
        result.poles = "4P";
    } else if (/\b(?:3\s*[-–]?\s*p|3\s*[-–]?\s*pole|3\s*[-–]?\s*poles|3p|3\s*phase|tp|triple\s*pole|three\s*pole)\b/i.test(lower)) {
        result.poles = "3P";
    } else if (/\b(?:2\s*[-–]?\s*p|2\s*[-–]?\s*pole|2\s*[-–]?\s*poles|2p|spn|2\s*phase|dp|double\s*pole|two\s*pole)\b/i.test(lower)) {
        result.poles = "2P";
    } else if (/\b(?:1\s*[-–]?\s*p|1\s*[-–]?\s*pole|1\s*[-–]?\s*poles|1p|single\s*phase|sp|single\s*pole|one\s*pole)\b/i.test(lower)) {
        result.poles = "1P";
    }

    // 5. Detect Breaking Capacity (e.g. 36kA, 50kA, 25kA, 10kA, 10 kA, 18kA)
    const kaMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*ka\b/i);
    if (kaMatch) {
        const num = parseFloat(kaMatch[1]);
        result.breakingCapacityNumeric = num;
        result.breakingCapacity = `${num}kA`;
    }

    // 6. Detect Power (e.g. 15kW, 7.5kW, 25kVAR, 30HP)
    const kwMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*(?:kw|hp|kvar)\b/i);
    if (kwMatch) {
        const num = parseFloat(kwMatch[1]);
        result.powerNumeric = num;
        result.powerRating = kwMatch[0].toUpperCase();
    }

    // 7. Detect Voltage / Coil (e.g. 415V, 240V, 230VAC, 24VDC, 110VAC, 500 Volts, 220 Volts)
    const voltMatch = raw.match(/\b(\d+)\s*(?:v|vac|vdc|volt|volts)\b/i);
    if (voltMatch) {
        const vNum = voltMatch[1];
        const isAcDc = /vac|vdc/i.test(voltMatch[0]);
        result.voltage = isAcDc ? voltMatch[0].toUpperCase() : `${vNum}V`;
    }

    // 8. Detect Curve (Curve B, Curve C, Curve D, Type C, TMD, Micrologic)
    if (/\b(?:curve\s*b|type\s*b|\bb\s*curve)\b/i.test(lower)) {
        result.curve = "Curve B";
    } else if (/\b(?:curve\s*c|type\s*c|\bc\s*curve)\b/i.test(lower)) {
        result.curve = "Curve C";
    } else if (/\b(?:curve\s*d|type\s*d|\bd\s*curve)\b/i.test(lower)) {
        result.curve = "Curve D";
    } else if (/\bmicrologic\b/i.test(lower)) {
        result.curve = "Micrologic";
    } else if (/\b(?:tmd|tma|thermal\s*magnetic)\b/i.test(lower)) {
        result.curve = "Thermal-Magnetic";
    }

    // 9. Extract remaining descriptive tokens
    const stopWords = new Set([
        "the", "a", "an", "and", "or", "with", "for", "in", "to", "of", "supply", "install",
        "brand", "type", "model", "equivalent", "nos", "no", "item", "rating", "spec", "specification",
    ]);

    const words = raw
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

    result.keywords = words;

    return result;
}

/**
 * Searches and matches catalog products against blind specifications or unstructured inquiry.
 */
export function matchBlindQuotation(
    filtersOrQuery: BlindSearchFilters | string,
    products: Product[],
    limit = 30
): BlindQuotationResult[] {
    if (products.length === 0) return [];

    let spec: ParsedElectricalSpec;
    let explicitBrand: string | undefined;
    let explicitType: string | undefined;
    let explicitCurrent: string | undefined;
    let explicitPoles: string | undefined;
    let explicitKa: string | undefined;
    let explicitVolt: string | undefined;
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (typeof filtersOrQuery === "string") {
        spec = parseElectricalQuery(filtersOrQuery);
    } else {
        const querySpec = filtersOrQuery.query ? parseElectricalQuery(filtersOrQuery.query) : { keywords: [] };
        spec = {
            brand: filtersOrQuery.brand || querySpec.brand,
            componentType: filtersOrQuery.componentType || querySpec.componentType,
            currentRating: filtersOrQuery.currentRating || querySpec.currentRating,
            currentNumeric: filtersOrQuery.currentRating ? parseFloat(filtersOrQuery.currentRating) : querySpec.currentNumeric,
            poles: filtersOrQuery.poles || querySpec.poles,
            breakingCapacity: filtersOrQuery.breakingCapacity || querySpec.breakingCapacity,
            breakingCapacityNumeric: filtersOrQuery.breakingCapacity ? parseFloat(filtersOrQuery.breakingCapacity) : querySpec.breakingCapacityNumeric,
            voltage: filtersOrQuery.voltage || querySpec.voltage,
            powerRating: filtersOrQuery.powerRating || querySpec.powerRating,
            powerNumeric: filtersOrQuery.powerRating ? parseFloat(filtersOrQuery.powerRating) : querySpec.powerNumeric,
            keywords: querySpec.keywords,
        };
        explicitBrand = filtersOrQuery.brand;
        explicitType = filtersOrQuery.componentType;
        explicitCurrent = filtersOrQuery.currentRating;
        explicitPoles = filtersOrQuery.poles;
        explicitKa = filtersOrQuery.breakingCapacity;
        explicitVolt = filtersOrQuery.voltage;
        minPrice = filtersOrQuery.minPrice;
        maxPrice = filtersOrQuery.maxPrice;
    }

    const results: BlindQuotationResult[] = [];

    for (const product of products) {
        // Price filters
        if (minPrice !== undefined && product.netCost < minPrice) continue;
        if (maxPrice !== undefined && product.netCost > maxPrice) continue;

        const prodText = `${product.brand} ${product.productCode} ${product.productName} ${product.description} ${product.category || ""} ${product.sku || ""}`.toLowerCase();
        const prodCode = product.productCode.toLowerCase();
        const prodDesc = (product.description || "").toLowerCase();
        const prodBrand = product.brand.toLowerCase();

        let score = 0;
        let maxPossible = 0;
        const matchedFeatures: string[] = [];
        const missingFeatures: string[] = [];

        // ── 1. Brand Matching (High Weight: 25 pts) ──
        let brandMatch = false;
        const targetBrand = (explicitBrand || spec.brand)?.toLowerCase();
        if (targetBrand) {
            maxPossible += 25;
            if (prodBrand.includes(targetBrand) || targetBrand.includes(prodBrand)) {
                score += 25;
                brandMatch = true;
                matchedFeatures.push(`Brand: ${product.brand}`);
            } else {
                // STRICT BRAND REJECTION: When a brand is targeted (e.g. ABB), never match products from another brand
                continue;
            }
        }

        // ── 2. Component Type Matching (Weight: 25 pts) ──
        let typeMatch = false;
        const targetType = (explicitType || spec.componentType)?.toUpperCase();
        if (targetType) {
            maxPossible += 25;
            const compDef = COMPONENT_TYPES.find((c) => c.type === targetType);
            if (compDef) {
                const isMatch = compDef.patterns.some((p) => p.test(prodText)) ||
                    compDef.synonyms.some((s) => prodText.includes(s)) ||
                    (product.category && product.category.toUpperCase().includes(targetType));

                if (isMatch) {
                    score += 25;
                    typeMatch = true;
                    matchedFeatures.push(`Type: ${compDef.label.split(" ")[0]}`);
                } else {
                    missingFeatures.push(`Type: not ${targetType}`);
                }
            }
        }

        // ── 3. Current / Amperage Matching (Weight: 25 pts) ──
        let currentMatch = false;
        const targetAmp = spec.currentNumeric || (explicitCurrent ? parseFloat(explicitCurrent) : undefined);
        if (targetAmp !== undefined && !isNaN(targetAmp)) {
            maxPossible += 25;
            // Test patterns: e.g. "250A", "250 A", "250Amp", "In=250", "250-", "/250", " 250 "
            const ampRegexExact = new RegExp(`\\b${targetAmp}\\s*(?:a|amp|amps|amperes)?\\b`, "i");
            const ampRegexInCode = new RegExp(`(?:[^0-9]|^)${targetAmp}(?:[^0-9]|$)`, "i");

            if (ampRegexExact.test(prodDesc) || ampRegexExact.test(prodText) || ampRegexInCode.test(prodCode)) {
                score += 25;
                currentMatch = true;
                matchedFeatures.push(`Rating: ${targetAmp}A`);
            } else {
                // Check for close range (e.g. adjustable 175-250A)
                const rangeRegex = new RegExp(`\\b\\d+\\s*[-/–]\\s*${targetAmp}\\b`);
                if (rangeRegex.test(prodDesc)) {
                    score += 20;
                    currentMatch = true;
                    matchedFeatures.push(`Rating: Range includes ${targetAmp}A`);
                } else {
                    missingFeatures.push(`Rating: ${targetAmp}A not found`);
                }
            }
        }

        // ── 4. Poles Matching (Weight: 15 pts) ──
        let polesMatch = false;
        const targetPoles = explicitPoles || spec.poles;
        if (targetPoles) {
            maxPossible += 15;
            const poleNum = targetPoles.replace(/[^0-9]/g, "");
            const poleRegex = new RegExp(`(?:\\b${targetPoles}\\b|\\b${poleNum}\\s*pole|\\b${poleNum}\\s*p\\b)`, "i");

            if (poleRegex.test(prodText) || prodCode.includes(`${poleNum}p`) || (poleNum === "3" && prodText.includes("3 phase"))) {
                score += 15;
                polesMatch = true;
                matchedFeatures.push(`Poles: ${targetPoles}`);
            } else {
                missingFeatures.push(`Poles: ${targetPoles} not matched`);
            }
        }

        // ── 5. Breaking Capacity Matching (Weight: 10 pts) ──
        let breakingCapacityMatch = false;
        const targetKa = spec.breakingCapacityNumeric || (explicitKa ? parseFloat(explicitKa) : undefined);
        if (targetKa !== undefined && !isNaN(targetKa)) {
            maxPossible += 10;
            const kaRegex = new RegExp(`\\b${targetKa}\\s*ka\\b`, "i");
            if (kaRegex.test(prodText)) {
                score += 10;
                breakingCapacityMatch = true;
                matchedFeatures.push(`Breaking Capacity: ${targetKa}kA`);
            } else {
                // Check if product has higher kA (which is electrically compatible or superior)
                const anyKa = prodText.match(/(\d+(?:\.\d+)?)\s*ka/);
                if (anyKa && parseFloat(anyKa[1]) >= targetKa) {
                    score += 8;
                    breakingCapacityMatch = true;
                    matchedFeatures.push(`Breaking Capacity: ${anyKa[1]}kA (>= ${targetKa}kA)`);
                } else {
                    missingFeatures.push(`kA: ${targetKa}kA not found`);
                }
            }
        }

        // ── 6. Voltage / Coil Matching (Weight: 5 pts) ──
        let voltageMatch = false;
        const targetVolt = explicitVolt || spec.voltage;
        if (targetVolt) {
            maxPossible += 5;
            if (prodText.includes(targetVolt.toLowerCase())) {
                score += 5;
                voltageMatch = true;
                matchedFeatures.push(`Voltage: ${targetVolt}`);
            }
        }

        // ── 7. Power Rating Matching (Weight: 5 pts) ──
        let powerMatch = false;
        if (spec.powerRating) {
            maxPossible += 5;
            if (prodText.includes(spec.powerRating.toLowerCase())) {
                score += 5;
                powerMatch = true;
                matchedFeatures.push(`Power: ${spec.powerRating}`);
            }
        }

        // ── 8. Extra Keyword Tokens (Bonus up to 10 pts) ──
        if (spec.keywords.length > 0) {
            let kwMatches = 0;
            for (const kw of spec.keywords) {
                if (prodText.includes(kw.toLowerCase())) {
                    kwMatches++;
                }
            }
            if (kwMatches > 0) {
                const bonus = Math.min(10, Math.round((kwMatches / spec.keywords.length) * 10));
                score += bonus;
                maxPossible += 10;
            }
        }

        // If no specific criteria were extracted, do a general text relevance
        if (maxPossible === 0) {
            maxPossible = 100;
            score = prodText.includes((filtersOrQuery as string).toLowerCase()) ? 60 : 20;
        }

        // Compute normalized score 0 to 1
        const normalizedScore = Math.min(1, Math.max(0, score / maxPossible));

        // Filter out low scores (below 35%)
        if (normalizedScore >= 0.35) {
            const summary = matchedFeatures.length > 0 ? matchedFeatures.join(" · ") : "General Match";
            results.push({
                product,
                score: Math.round(normalizedScore * 100) / 100,
                matchDetails: {
                    brandMatch,
                    typeMatch,
                    currentMatch,
                    polesMatch,
                    breakingCapacityMatch,
                    voltageMatch,
                    powerMatch,
                    matchedFeatures,
                    missingFeatures,
                },
                matchedSpecsSummary: summary,
            });
        }
    }

    // Sort by score descending, then by netCost ascending
    return results
        .sort((a, b) => b.score - a.score || a.product.netCost - b.product.netCost)
        .slice(0, limit);
}

/**
 * Returns available component categories for UI selector.
 */
export function getComponentCategories(): { type: string; label: string }[] {
    return COMPONENT_TYPES.map((c) => ({ type: c.type, label: c.label }));
}

/**
 * Returns list of standard current ratings for quick selection.
 */
export const STANDARD_CURRENT_RATINGS = [
    "6A", "10A", "16A", "20A", "25A", "32A", "40A", "50A", "63A", "80A",
    "100A", "125A", "160A", "200A", "250A", "320A", "400A", "500A", "630A",
    "800A", "1000A", "1250A", "1600A", "2000A", "2500A", "3200A", "4000A", "6300A"
];

/**
 * Returns standard breaking capacities for quick selection.
 */
export const STANDARD_KA_RATINGS = [
    "4.5kA", "6kA", "10kA", "16kA", "18kA", "25kA", "36kA", "50kA", "65kA", "70kA", "85kA", "100kA", "150kA"
];

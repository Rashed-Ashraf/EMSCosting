"use client";

import { StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

/**
 * High-capacity, non-blocking IndexedDB storage engine for Zustand persistence.
 * Prevents localStorage QuotaExceededError (~5-10MB browser limit) when storing large product catalogs.
 * Automatically migrates existing state from localStorage to IndexedDB on first load.
 */
export const indexedDbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === "undefined") return null;

        // 1. Try reading from IndexedDB
        try {
            const val = await get<string>(name);
            if (val) return val;
        } catch (err) {
            console.warn("[Storage] Failed to read from IndexedDB, trying localStorage fallback:", err);
        }

        // 2. Migration from legacy localStorage
        try {
            const legacy = localStorage.getItem(name);
            if (legacy) {
                // Migrate to IndexedDB in background
                set(name, legacy)
                    .then(() => {
                        console.info(`[Storage] Successfully migrated '${name}' from localStorage to IndexedDB.`);
                        try {
                            localStorage.removeItem(name);
                        } catch {}
                    })
                    .catch((err) => {
                        console.warn("[Storage] Background migration to IndexedDB failed:", err);
                    });
                return legacy;
            }
        } catch {}

        return null;
    },

    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === "undefined") return;

        // Save to IndexedDB (asynchronous, high quota >50MB-1GB, non-blocking)
        try {
            await set(name, value);
        } catch (err) {
            console.error("[Storage] Failed to write to IndexedDB:", err);
            // Fallback: try saving to localStorage if small enough, but safely catch QuotaExceededError
            try {
                localStorage.setItem(name, value);
            } catch (lsErr) {
                console.warn("[Storage] Fallback to localStorage failed or exceeded quota:", lsErr);
            }
        }
    },

    removeItem: async (name: string): Promise<void> => {
        if (typeof window === "undefined") return;

        try {
            await del(name);
        } catch (err) {
            console.error("[Storage] Failed to delete from IndexedDB:", err);
        }

        try {
            localStorage.removeItem(name);
        } catch {}
    },
};


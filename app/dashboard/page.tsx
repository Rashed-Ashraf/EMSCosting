"use client";

import { useEmsStore } from "@/stores/appStore";
import Link from "next/link";

export default function DashboardPage() {
    const { priceLists, products, costingSession, boqMatches } = useEmsStore();

    const loadedBrands = [...new Set(priceLists.filter((pl) => pl.status === "ready").map((pl) => pl.brand))];
    const costingItemCount = costingSession?.items?.length ?? 0;

    return (
        <div style={{ padding: "28px 32px" }}>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>
                        ⚡ Dashboard
                    </h1>
                    <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                        Electrical Master — AI Costing & Quotation Tool
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link href="/costing" className="btn-primary">
                        🧮 New Costing
                    </Link>
                    <Link href="/price-lists" className="btn-secondary">
                        📋 Upload Price List
                    </Link>
                </div>
            </div>

            {/* Session Warning */}
            {costingItemCount > 0 && (
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#f59e0b" }}>
                    ⚠️ You have an active costing session with {costingItemCount} item{costingItemCount !== 1 ? "s" : ""}. Download your files before refreshing or starting a new costing.
                </div>
            )}

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: "24px" }}>
                <div className="stat-card">
                    <div className="stat-value gradient-text">{products.length.toLocaleString()}</div>
                    <div className="stat-label">Products Indexed</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {loadedBrands.length} brand{loadedBrands.length !== 1 ? "s" : ""} loaded
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-value gradient-text">{priceLists.length}</div>
                    <div className="stat-label">Price Lists</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {priceLists.filter((pl) => pl.status === "ready").length} active
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-value gradient-text">{costingItemCount}</div>
                    <div className="stat-label">Costing Items</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {costingSession ? "Session active" : "No active session"}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-value gradient-text">{boqMatches.length}</div>
                    <div className="stat-label">BOQ Matches</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {boqMatches.filter((m) => m.status === "accepted").length} accepted
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ gap: "20px" }}>
                {/* Loaded Brands */}
                <div className="card">
                    <h2 className="section-title" style={{ marginBottom: "16px", fontSize: "15px" }}>
                        📡 Session Data
                    </h2>
                    <div style={{ marginBottom: "12px" }}>
                        <div className="label">Loaded Brands</div>
                        {loadedBrands.length === 0 ? (
                            <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                                No price lists loaded.{" "}
                                <Link href="/price-lists" style={{ color: "var(--accent)" }}>Upload one now →</Link>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                                {loadedBrands.map((brand) => (
                                    <span key={brand} className="badge badge-blue">⚡ {brand}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <hr className="divider" />
                    <div>
                        <div className="label">Price List Status</div>
                        {priceLists.length === 0 ? (
                            <div style={{ color: "var(--muted)", fontSize: "13px" }}>No price lists.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                                {priceLists.map((pl) => (
                                    <div key={pl.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--muted-bg)", borderRadius: "8px", padding: "8px 12px" }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{pl.brand}</span>
                                            <span style={{ color: "var(--muted)", fontSize: "12px", marginLeft: "8px" }}>{pl.fileName}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{pl.productCount.toLocaleString()} products</span>
                                            <span className={`badge ${pl.status === "ready" ? "badge-green" : pl.status === "error" ? "badge-red" : "badge-yellow"}`}>
                                                {pl.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="section-title" style={{ marginBottom: "16px", fontSize: "15px" }}>
                        🚀 Quick Actions
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <QuickAction
                            href="/blind-quotation"
                            icon="⚡"
                            title="Blind Quotation Finder"
                            desc="Search models by electrical readings (Amps, Poles, kA) & brand"
                        />
                        <QuickAction
                            href="/price-lists"
                            icon="📋"
                            title="Upload Price List"
                            desc="Add Schneider, ABB, Siemens, or other brand price lists"
                        />
                        <QuickAction
                            href="/costing"
                            icon="🧮"
                            title="New Costing"
                            desc="Search products, set quantities, and calculate costs"
                        />
                        <QuickAction
                            href="/import-boq"
                            icon="📥"
                            title="Import BOQ"
                            desc="Upload a customer BOQ and auto-match products"
                        />
                        <QuickAction
                            href="/templates"
                            icon="📄"
                            title="Manage Templates"
                            desc="Upload your Excel costing/quotation templates"
                        />
                    </div>

                    {/* Current Costing Summary */}
                    {costingSession && costingItemCount > 0 && (
                        <>
                            <hr className="divider" />
                            <div>
                                <div className="label">Current Costing</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{costingSession.header.customerName || "Unnamed Customer"}</div>
                                        <div style={{ color: "var(--muted)", fontSize: "12px" }}>{costingSession.header.project || "No project"}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "16px" }}>
                                            {new Intl.NumberFormat("en-AU", { style: "currency", currency: costingSession.header.currency }).format(costingSession.totals.grandTotal)}
                                        </div>
                                        <div style={{ color: "var(--muted)", fontSize: "12px" }}>{costingItemCount} items incl. GST</div>
                                    </div>
                                </div>
                                <Link href="/costing" className="btn-primary" style={{ width: "100%", marginTop: "12px", justifyContent: "center" }}>
                                    Continue Costing →
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickAction({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
    return (
        <Link
            href={href}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--muted-bg)",
                transition: "border-color 0.15s, background 0.15s",
                textDecoration: "none",
            }}
            onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
            }}
            onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.background = "var(--muted-bg)";
            }}
        >
            <span style={{ fontSize: "22px" }}>{icon}</span>
            <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>{title}</div>
                <div style={{ color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>{desc}</div>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--muted)" }}>→</span>
        </Link>
    );
}

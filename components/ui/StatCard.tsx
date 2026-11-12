import React from "react";

export interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="text-3xl font-bold text-[#1d4ed8] tracking-tight mb-1.5">
        {value}
      </div>
      <div className="text-xs font-semibold text-[#1e293b] mb-1">
        {label}
      </div>
      <div className="text-[11px] text-[#64748b]">
        {subtitle}
      </div>
    </div>
  );
}

export default StatCard;

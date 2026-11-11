import React from "react";

export interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

export function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>
    </div>
  );
}

export default StatCard;


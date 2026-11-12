import React from "react";
import Link from "next/link";

export interface QuickActionProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  description: string;
  href: string;
}

export function QuickAction({ icon, title, description, href }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff]/60 hover:border-[#bfdbfe] transition-all group mb-3"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="text-xl shrink-0 flex items-center justify-center">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#1e293b] group-hover:text-[#1d4ed8] transition-colors truncate">
            {title}
          </div>
          <div className="text-xs text-[#64748b] truncate mt-0.5">
            {description}
          </div>
        </div>
      </div>
      <span className="text-[#94a3b8] group-hover:text-[#1d4ed8] group-hover:translate-x-1 transition-all text-sm shrink-0 ml-2">
        →
      </span>
    </Link>
  );
}

export default QuickAction;

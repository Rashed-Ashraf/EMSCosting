import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface QuickActionProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  href: string;
}

export function QuickAction({ icon, iconBg, title, description, href }: QuickActionProps) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </div>
        <div className="text-xs text-neutral-500 truncate">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-transform group-hover:translate-x-0.5 shrink-0" />
    </Link>
  );
}

export default QuickAction;


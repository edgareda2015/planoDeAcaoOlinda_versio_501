import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/60 mb-6", className)}>
      <div className="space-y-1">
        {category && (
          <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest leading-none block">
            {category}
          </span>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 font-normal">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-100 text-slate-800 font-medium",
        gold: "border-amber-400/40 bg-amber-50 text-amber-900 font-bold",
        navy: "border-transparent bg-[#0B1727] text-white font-medium",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        destructive: "border-red-200 bg-red-50 text-red-700 font-medium",
        outline: "border-slate-200 text-slate-700 font-medium",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
        warning: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
        info: "border-blue-200 bg-blue-50 text-blue-700 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

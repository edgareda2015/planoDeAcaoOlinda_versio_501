import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
}: MetricCardProps) => {
  const variantStyles = {
    default: "from-primary/10 to-primary/5 border-primary/20",
    success: "from-accent/10 to-accent/5 border-accent/20",
    warning: "from-warning/10 to-warning/5 border-warning/20",
    destructive: "from-destructive/10 to-destructive/5 border-destructive/20",
  };

  const iconStyles = {
    default: "bg-primary text-primary-foreground",
    success: "bg-accent text-accent-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br p-6 transition-all hover:shadow-lg",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trendValue && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-accent",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-3 shadow-sm",
            iconStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SectorCardProps {
  title: string;
  icon: LucideIcon;
  goal: number;
  achieved: number;
  status: "excellent" | "good" | "regular" | "attention" | "critical";
  colors: { bg: string; text: string };
}

export const SectorCard = ({
  title,
  icon: Icon,
  goal,
  achieved,
  status,
  colors,
}: SectorCardProps) => {
  const percentage = goal > 0 ? Math.round((achieved / goal) * 100) : 0;
  
  const statusConfig = {
    excellent: { label: "Excelente", className: "bg-accent text-accent-foreground" },
    good: { label: "Bom", className: "bg-sky-500 text-white" },
    regular: { label: "Regular", className: "bg-warning text-warning-foreground" },
    attention: { label: "Atenção", className: "bg-orange-500 text-white" },
    critical: { label: "Crítico", className: "bg-destructive text-destructive-foreground" },
  };

  return (
    <Card className="p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg p-2", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {achieved} / {goal}
            </p>
          </div>
        </div>
        <Badge className={statusConfig[status].className}>
          {statusConfig[status].label}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold text-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    </Card>
  );
};
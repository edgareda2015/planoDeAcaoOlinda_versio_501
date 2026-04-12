import { Flag, Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TotalProgressTrackerProps {
  achieved: number;
  total: number;
}

export const TotalProgressTracker = ({ achieved, total }: TotalProgressTrackerProps) => {
  const percentage = total > 0 ? (achieved / total) * 100 : 0;
  const remaining = Math.max(total - achieved, 0);
  const milestones = [20, 40, 60, 80, 100];

  const getProgressColors = () => {
    if (percentage <= 20) return { bar: "from-destructive/70 to-destructive", icon: "bg-destructive text-destructive-foreground" };
    if (percentage <= 40) return { bar: "from-orange-500 to-orange-600", icon: "bg-orange-600 text-white" };
    if (percentage <= 60) return { bar: "from-warning/70 to-warning", icon: "bg-warning text-warning-foreground" };
    if (percentage <= 80) return { bar: "from-sky-500 to-sky-600", icon: "bg-sky-600 text-white" };
    return { bar: "from-accent/70 to-accent", icon: "bg-accent text-accent-foreground" };
  };

  const { bar: progressBarColor, icon: rocketIconColor } = getProgressColors();

  const getRemainingTextColor = () => {
    if (percentage <= 40) return "text-destructive";
    if (percentage <= 80) return "text-warning";
    return "text-accent";
  };

  const remainingTextColor = getRemainingTextColor();

  return (
    <Card className="p-4 w-full">
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
          <span>Progresso Geral da Captação</span>
          <span className="font-bold text-foreground">{percentage.toFixed(1)}%</span>
        </div>
        
        <div className="relative w-full h-8 bg-secondary rounded-full overflow-hidden border">
          {/* Barra de Progresso */}
          <div
            className={cn("absolute top-0 left-0 h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out", progressBarColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          
          {/* Ícone de Foguete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-20"
                style={{ left: `${Math.min(percentage, 100)}%` }}
              >
                <Rocket className={cn("h-6 w-6 text-primary-foreground transform -rotate-45 p-1 rounded-full shadow-lg", rocketIconColor)} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Realizado: {achieved.toLocaleString()}</p>
              <p>Faltam: {remaining.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>

          {/* Marcos de Progresso (Posicionados Absolutamente) */}
          {milestones.map((milestone) => {
            const isMilestoneReached = percentage >= milestone;
            const milestoneValue = Math.round(total * (milestone / 100));
            const remainingToMilestone = Math.max(0, milestoneValue - achieved);
            
            // O marco de 100% é a bandeira, então não o duplicamos aqui
            if (milestone === 100) return null;

            return (
              <Tooltip key={milestone}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
                    style={{ left: `${milestone}%` }}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 transition-colors",
                      isMilestoneReached ? "bg-accent border-accent/50" : "bg-background border-muted-foreground/50"
                    )}></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">Marco de {milestone}%: {milestoneValue.toLocaleString()}</p>
                  {isMilestoneReached ? (
                    <p className="text-accent">Marco alcançado!</p>
                  ) : (
                    <p>Faltam {remainingToMilestone.toLocaleString()} para atingir.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Ícone da Linha de Chegada (100%) */}
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            <Flag className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* NOVOS MARCOS VISUAIS (Texto e Valores) - REMOVIDO */}
        {/* O bloco de código que renderizava os percentuais 20%, 40%, etc. foi removido daqui. */}

        <div className="flex justify-between items-start text-xs md:text-sm">
          <div className="text-left">
            <p className="font-bold text-primary text-lg">{achieved.toLocaleString()}</p>
            <p className="text-muted-foreground">Realizado</p>
          </div>
          <div className="text-center">
            <p className={cn("font-bold text-lg", remainingTextColor)}>{remaining.toLocaleString()}</p>
            <p className="text-muted-foreground">Restante</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground text-lg">{total.toLocaleString()}</p>
            <p className="text-muted-foreground">Meta Total</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
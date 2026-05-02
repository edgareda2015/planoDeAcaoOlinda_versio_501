import { Action, ActionStatus } from "@/hooks/useActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";

interface ActionCardProps {
  action: Action;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusConfig: Record<ActionStatus, { label: string; className: string; }> = {
  planning: { label: "A FAZER", className: "bg-destructive text-destructive-foreground border-destructive/50" },
  partial: { label: "FAZENDO", className: "bg-amber-500 text-white border-amber-500/50" },
  completed: { label: "FINALIZADO", className: "bg-accent text-accent-foreground border-accent/50" },
  cancelled: { label: "CANCELADO", className: "bg-muted text-muted-foreground border-muted/50" },
};

export const ActionCard = ({ action, onClick, onEdit, onDelete }: ActionCardProps) => {
  const status = statusConfig[action.status];

  return (
    <Card className="mb-4 group transition-shadow hover:shadow-md">
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div onClick={onClick} className="cursor-pointer">
            <Badge className={cn("font-semibold", status.className)}>{status.label}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Editar Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-grow cursor-pointer" onClick={onClick}>
          <CardTitle className="text-base font-bold">{action.description}</CardTitle>
          <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            <p className="mb-2 font-medium">{action.sectors?.name || 'N/A'}</p>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {action.status === 'completed' ? 'Entregue em: ' : 'Prazo: '}
                {action.end_date ? format(new Date(action.end_date.replace(/-/g, '/')), 'dd/MM/yyyy') : 'N/A'}
              </span>
            </div>
            {(action.expected_enrollment > 0) && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-foreground">Matrículas</span>
                  <span className="text-muted-foreground">{action.completed_enrollment}/{action.expected_enrollment}</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (action.completed_enrollment / action.expected_enrollment) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
};
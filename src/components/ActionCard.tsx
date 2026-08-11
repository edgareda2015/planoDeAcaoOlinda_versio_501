import { Action, ActionStatus } from "@/hooks/useActions";
import { Card, CardTitle } from "@/components/ui/card";
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

const statusConfig: Record<ActionStatus, { label: string; variant: "destructive" | "warning" | "success" | "secondary"; }> = {
  planning: { label: "A FAZER", variant: "destructive" },
  partial: { label: "FAZENDO", variant: "warning" },
  completed: { label: "FINALIZADO", variant: "success" },
  cancelled: { label: "CANCELADO", variant: "secondary" },
};

export const ActionCard = ({ action, onClick, onEdit, onDelete }: ActionCardProps) => {
  const status = statusConfig[action.status];

  return (
    <Card className="mb-3 group border border-slate-200/80 bg-white hover:border-[#D4AF37]/50 hover:shadow-md transition-all rounded-xl overflow-hidden">
      <div className="p-3.5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div onClick={onClick} className="cursor-pointer">
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-3.5 w-3.5 text-slate-600" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 focus:text-red-700">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-grow cursor-pointer" onClick={onClick}>
          <CardTitle className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 mb-1.5">{action.description}</CardTitle>
          <div className="text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">{action.sectors?.name || 'Setor não informado'}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {action.status === 'completed' ? 'Entregue: ' : 'Prazo: '}
                {action.end_date ? format(new Date(action.end_date.replace(/-/g, '/')), 'dd/MM/yyyy') : 'Sem data'}
              </span>
            </div>
            {(action.expected_enrollment > 0 || (action.effective_enrollment ?? 0) > 0) && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Leads (Real / Esp.)</span>
                  <span className="font-bold text-slate-800">{action.completed_enrollment} / {action.expected_enrollment}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#0B1727] h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${action.expected_enrollment > 0 ? Math.min(100, (action.completed_enrollment / action.expected_enrollment) * 100) : 0}%` }}
                  />
                </div>
                {(action.effective_enrollment ?? 0) > 0 && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase">Matrículas Efetivadas</span>
                    <span className="text-xs font-black text-[#0B1727]">{action.effective_enrollment}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
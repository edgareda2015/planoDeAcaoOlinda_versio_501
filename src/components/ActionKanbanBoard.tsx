import { Action, ActionStatus, useDeleteAction, useUpdateAction } from "@/hooks/useActions";
import { ActionCard } from "./ActionCard";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ActionDetailView } from "./ActionDetailView";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Target, TrendingUp, Users, CheckCircle2, ListTodo, Activity, Ban } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { MetricCard } from "./MetricCard";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";

interface ActionKanbanBoardProps {
  actions: Action[];
  onEditAction: (action: Action) => void;
}

type KanbanColumn = "A FAZER" | "FAZENDO" | "CANCELADO" | "FINALIZADO";

const columns: KanbanColumn[] = ["A FAZER", "FAZENDO", "CANCELADO", "FINALIZADO"];

const columnConfig: Record<KanbanColumn, { statuses: ActionStatus[], className: string }> = {
  "A FAZER": { statuses: ["planning"], className: "bg-red-50/50 border border-red-100" },
  "FAZENDO": { statuses: ["partial"], className: "bg-yellow-50/50 border border-yellow-100" },
  "CANCELADO": { statuses: ["cancelled"], className: "bg-slate-50/50 border border-slate-100" },
  "FINALIZADO": { statuses: ["completed"], className: "bg-green-50/50 border border-green-100" },
};

const columnHeaderConfig: Record<KanbanColumn, { className: string }> = {
  "A FAZER": { className: "bg-destructive text-destructive-foreground shadow-sm" },
  "FAZENDO": { className: "bg-yellow-500 text-white shadow-sm" },
  "CANCELADO": { className: "bg-slate-500 text-white shadow-sm" },
  "FINALIZADO": { className: "bg-accent text-accent-foreground shadow-sm" },
};

export const ActionKanbanBoard = ({ actions, onEditAction }: ActionKanbanBoardProps) => {
  const [detailViewAction, setDetailViewAction] = useState<Action | null>(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState<Action | null>(null);
  const { mutate: deleteAction, isPending: isDeleting } = useDeleteAction();
  const { mutate: updateAction } = useUpdateAction();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const action = actions.find(a => a.id === draggableId);
    if (!action) return;

    const targetColumn = destination.droppableId as KanbanColumn;
    const currentColumn = columns.find(col => columnConfig[col].statuses.includes(action.status));

    if (targetColumn === currentColumn) return;

    // Map column to default status
    const statusMap: Record<KanbanColumn, ActionStatus> = {
      "A FAZER": "planning",
      "FAZENDO": "partial",
      "CANCELADO": "cancelled",
      "FINALIZADO": "completed"
    };

    const newStatus = statusMap[targetColumn];

    updateAction({ id: action.id, status: newStatus }, {
      onSuccess: () => {
        toast.success(`Ação movida para ${targetColumn}`);
      }
    });
  };

  const groupedActions = useMemo(() => {
    const groups: Record<KanbanColumn, Action[]> = { "A FAZER": [], "FAZENDO": [], "CANCELADO": [], "FINALIZADO": [] };
    actions.forEach(action => {
      if (columnConfig["A FAZER"].statuses.includes(action.status)) groups["A FAZER"].push(action);
      else if (columnConfig["FAZENDO"].statuses.includes(action.status)) groups["FAZENDO"].push(action);
      else if (columnConfig["CANCELADO"].statuses.includes(action.status)) groups["CANCELADO"].push(action);
      else if (columnConfig["FINALIZADO"].statuses.includes(action.status)) groups["FINALIZADO"].push(action);
    });
    return groups;
  }, [actions]);

  const stats = useMemo(() => {
    const total = actions.length;
    const expected = actions.reduce((acc, curr) => acc + (curr.expected_enrollment || 0), 0);
    const completed = actions.reduce((acc, curr) => acc + (curr.completed_enrollment || 0), 0);
    const conversion = expected > 0 ? Math.round((completed / expected) * 100) : 0;
    return { total, expected, completed, conversion };
  }, [actions]);

  const topActions = useMemo(() => {
    return [...actions]
      .sort((a, b) => (b.completed_enrollment || 0) - (a.completed_enrollment || 0))
      .slice(0, 3)
      .filter(a => (a.completed_enrollment || 0) > 0);
  }, [actions]);

  const handleDeleteConfirm = () => {
    if (deleteActionTarget) {
      deleteAction(deleteActionTarget.id, {
        onSuccess: () => setDeleteActionTarget(null),
      });
    }
  };

  const handleEditFromDetail = () => {
    if (detailViewAction) {
      onEditAction(detailViewAction);
      setDetailViewAction(null);
    }
  };

  return (
    <>
      <div className="space-y-8 mb-8">
      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Ações"
          value={stats.total}
          icon={ListTodo}
          variant="default"
        />
        <MetricCard
          title="Matrículas Esperadas"
          value={stats.expected}
          icon={Target}
          variant="warning"
        />
        <MetricCard
          title="Matrículas Concluídas"
          value={stats.completed}
          icon={Users}
          variant="success"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${stats.conversion}%`}
          icon={TrendingUp}
          subtitle="Eficiência das ações"
          variant={stats.conversion > 70 ? "success" : stats.conversion > 40 ? "warning" : "default"}
        />
      </div>

      {/* Top Performing Actions (Destaques) */}
      {topActions.length > 0 && (
        <Card className="p-4 border-none bg-gradient-to-r from-primary/10 via-background to-background border-l-4 border-l-primary shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Destaques de Conversão (Top 3)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topActions.map((action, index) => (
              <div 
                key={action.id} 
                className="flex items-center gap-3 p-2 rounded-lg bg-white/50 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setDetailViewAction(action)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-black text-sm group-hover:scale-110 transition-transform">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">{action.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">{action.sectors?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-primary leading-none">{action.completed_enrollment}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Matrículas</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex gap-3 w-max md:w-full min-w-0">
          {columns.map(column => (
            <Card key={`stat-${column}`} className="flex-1 min-w-[150px] p-3 flex flex-col items-center justify-center text-center space-y-1 bg-muted/30 border-dashed">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{column}</span>
              <span className="text-xl font-black">{groupedActions[column].length}</span>
              <div className={cn("h-1 w-8 rounded-full", columnHeaderConfig[column].className.split(' ')[0])} />
            </Card>
          ))}
        </div>
      </div>

      <Separator className="opacity-50" />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-6 custom-scrollbar -mx-4 px-4">
          <div className="flex gap-4 md:gap-6 w-max md:w-full min-w-0">
            {columns.map(column => (
              <Droppable key={column} droppableId={column}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 min-w-[280px] md:min-w-[300px] max-w-[400px] shrink-0 rounded-lg p-3 md:p-4 transition-colors", 
                      columnConfig[column].className,
                      snapshot.isDraggingOver && "ring-2 ring-primary ring-inset ring-opacity-50"
                    )}
                  >
                  <div className={cn("px-3 py-1 rounded-md text-sm font-bold inline-block mb-4", columnHeaderConfig[column].className)}>
                    {column}
                  </div>
                  <div className="space-y-1 min-h-[150px]">
                    {groupedActions[column].length > 0 ? (
                      groupedActions[column].map((action, index) => (
                        <Draggable key={action.id} draggableId={action.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(snapshot.isDragging && "opacity-80 scale-105 z-50 transition-transform")}
                            >
                              <ActionCard
                                action={action}
                                onClick={() => setDetailViewAction(action)}
                                onEdit={() => onEditAction(action)}
                                onDelete={() => setDeleteActionTarget(action)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma ação nesta coluna.
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>

      <ActionDetailView
        isOpen={!!detailViewAction}
        action={detailViewAction}
        onClose={() => setDetailViewAction(null)}
        onEdit={handleEditFromDetail}
      />

      <AlertDialog open={!!deleteActionTarget} onOpenChange={(open) => !open && setDeleteActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
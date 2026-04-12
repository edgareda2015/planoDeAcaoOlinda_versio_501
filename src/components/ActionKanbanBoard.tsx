import { Action, ActionStatus, useDeleteAction } from "@/hooks/useActions";
import { ActionCard } from "./ActionCard";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ActionDetailView } from "./ActionDetailView";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ActionKanbanBoardProps {
  actions: Action[];
  onEditAction: (action: Action) => void;
}

type KanbanColumn = "A FAZER" | "PENDENTE" | "FINALIZADO";

const columns: KanbanColumn[] = ["A FAZER", "PENDENTE", "FINALIZADO"];

const columnConfig: Record<KanbanColumn, { statuses: ActionStatus[], className: string }> = {
  "A FAZER": { statuses: ["planning"], className: "bg-red-100" },
  "PENDENTE": { statuses: ["partial", "delayed"], className: "bg-yellow-100" },
  "FINALIZADO": { statuses: ["completed"], className: "bg-green-100" },
};

const columnHeaderConfig: Record<KanbanColumn, { className: string }> = {
  "A FAZER": { className: "bg-destructive text-destructive-foreground" },
  "PENDENTE": { className: "bg-warning text-warning-foreground" },
  "FINALIZADO": { className: "bg-accent text-accent-foreground" },
};

export const ActionKanbanBoard = ({ actions, onEditAction }: ActionKanbanBoardProps) => {
  const [detailViewAction, setDetailViewAction] = useState<Action | null>(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState<Action | null>(null);
  const { mutate: deleteAction, isPending: isDeleting } = useDeleteAction();

  const groupedActions = useMemo(() => {
    const groups: Record<KanbanColumn, Action[]> = { "A FAZER": [], "PENDENTE": [], "FINALIZADO": [] };
    actions
      .filter(action => action.status !== 'cancelled')
      .forEach(action => {
        if (columnConfig["A FAZER"].statuses.includes(action.status)) groups["A FAZER"].push(action);
        else if (columnConfig["PENDENTE"].statuses.includes(action.status)) groups["PENDENTE"].push(action);
        else if (columnConfig["FINALIZADO"].statuses.includes(action.status)) groups["FINALIZADO"].push(action);
    });
    return groups;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {columns.map(column => (
          <div key={column} className={cn("rounded-lg p-4", columnConfig[column].className)}>
            <div className={cn("px-3 py-1 rounded-md text-sm font-bold inline-block mb-4", columnHeaderConfig[column].className)}>
              {column}
            </div>
            <div className="space-y-1">
              {groupedActions[column].length > 0 ? (
                groupedActions[column].map(action => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onClick={() => setDetailViewAction(action)}
                    onEdit={() => onEditAction(action)}
                    onDelete={() => setDeleteActionTarget(action)}
                  />
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma ação nesta coluna.
                </div>
              )}
            </div>
          </div>
        ))}
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
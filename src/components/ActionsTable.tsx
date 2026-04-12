import { useState, useMemo } from "react";
import { useActions, useUpdateAction, useDeleteAction, Action, ActionStatus } from "@/hooks/useActions";
import { format } from "date-fns";
import { Loader2, XCircle, MoreHorizontal, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusConfig: Record<ActionStatus, { label: string; className: string; rowClassName: string }> = {
  // Cores mais fortes para o fundo da linha
  planning: { label: "Planejamento", className: "bg-gray-100 text-gray-800 border-gray-300", rowClassName: "bg-gray-100 hover:bg-gray-200" },
  partial: { label: "Parcial", className: "bg-blue-100 text-blue-800 border-blue-300", rowClassName: "bg-blue-100 hover:bg-blue-200" },
  completed: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-300", rowClassName: "bg-green-100 hover:bg-green-200" },
  delayed: { label: "Atrasado", className: "bg-red-100 text-red-800 border-red-300", rowClassName: "bg-red-100 hover:bg-red-200" },
  cancelled: { label: "Cancelado", className: "bg-orange-100 text-orange-800 border-orange-300", rowClassName: "bg-orange-100 hover:bg-orange-200" },
};

interface ActionsTableProps {
  actions?: Action[];
  onEdit?: (action: Action) => void;
}

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Action | 'sectors.name';

export const ActionsTable = ({ actions: actionsProp, onEdit }: ActionsTableProps) => {
  const queryResult = useActions();
  const actions = actionsProp || queryResult.data;
  const isLoading = !actionsProp && queryResult.isLoading;
  const isError = !actionsProp && queryResult.isError;

  const { mutate: updateAction } = useUpdateAction();
  const { mutate: deleteAction, isPending: isDeleting } = useDeleteAction();

  const [actionToDelete, setActionToDelete] = useState<Action | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const handleStatusChange = (actionId: string, status: ActionStatus) => {
    updateAction({ id: actionId, status });
  };

  const sortedActions = useMemo(() => {
    let sortableItems = [...(actions || [])];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortValue = (item: Action, key: SortKey) => {
          if (key === 'sectors.name') return item.sectors?.name?.toLowerCase();
          const value = item[key as keyof Action];
          return typeof value === 'string' ? value.toLowerCase() : value;
        };

        const aValue = getSortValue(a, sortConfig.key);
        const bValue = getSortValue(b, sortConfig.key);

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [actions, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (isError || !actions) {
    return <Card className="p-6 text-destructive flex items-center"><XCircle className="h-5 w-5 mr-2" />Erro ao carregar ações.</Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Plano de Ação</CardTitle>
          <CardDescription>Acompanhamento detalhado de todas as ações planejadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary [&_th]:text-primary-foreground hover:bg-primary/90">
                  <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('sectors.name')}>Área{renderSortIcon('sectors.name')}</Button></TableHead>
                  <TableHead className="w-[25%]">Ação</TableHead>
                  <TableHead className="w-[25%]">Como</TableHead>
                  <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('start_date')}>Data Início{renderSortIcon('start_date')}</Button></TableHead>
                  <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('end_date')}>Data Término{renderSortIcon('end_date')}</Button></TableHead>
                  <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('responsible_name')}>Responsável{renderSortIcon('responsible_name')}</Button></TableHead>
                  <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('status')}>Status{renderSortIcon('status')}</Button></TableHead>
                  {onEdit && <TableHead className="w-[64px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActions.length === 0 ? (
                  <TableRow><TableCell colSpan={onEdit ? 8 : 7} className="h-24 text-center">Nenhuma ação encontrada.</TableCell></TableRow>
                ) : (
                  sortedActions.map((action) => (
                    <TableRow 
                      key={action.id} 
                      className={cn(
                        "transition-colors duration-200",
                        statusConfig[action.status].rowClassName
                      )}
                    >
                      <TableCell>{action.sectors?.name || 'N/A'}</TableCell>
                      <TableCell className="font-medium whitespace-normal break-words">
                        {action.description}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        {action.how_to_do || 'N/A'}
                      </TableCell>
                      <TableCell>{action.start_date ? format(new Date(action.start_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{action.end_date ? format(new Date(action.end_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{action.responsible_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Select value={action.status} onValueChange={(value) => handleStatusChange(action.id, value as ActionStatus)}>
                          <SelectTrigger className={cn("w-[150px] border-0 focus:ring-0", statusConfig[action.status].className)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {onEdit && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(action)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionToDelete(action)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!actionToDelete} onOpenChange={(open) => !open && setActionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a ação.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (actionToDelete) deleteAction(actionToDelete.id); setActionToDelete(null); }} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
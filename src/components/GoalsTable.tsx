import { useState, useMemo } from "react";
import { useGoals, Goal, useDeleteGoal } from "@/hooks/useGoals";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { XCircle, Loader2, Pencil, MoreHorizontal, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { UpdateGoalModal } from "./UpdateGoalModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const calculatePerformance = (goal: Goal) => {
  const percentage = goal.target_quantity > 0 ? (goal.achieved_quantity / goal.target_quantity) * 100 : 0;
  const difference = goal.achieved_quantity - goal.target_quantity;
  
  let status: "success" | "warning" | "danger" | "pending";
  let statusLabel: string;

  if (goal.achieved_quantity >= goal.target_quantity) {
    status = "success";
    statusLabel = "Concluída";
  } else if (percentage >= 80) {
    status = "warning";
    statusLabel = "Quase lá";
  } else if (percentage > 0) {
    status = "pending";
    statusLabel = "Em Andamento";
  } else {
    const endDate = new Date(goal.period_end_date);
    const today = new Date();
    
    if (endDate < today) {
        status = "danger";
        statusLabel = "Atrasada";
    } else {
        status = "pending";
        statusLabel = "Em Planejamento";
    }
  }

  return {
    percentage: Math.round(percentage),
    difference,
    status,
    statusLabel,
  };
};

const StatusBadge = ({ status, label }: { status: string, label: string }) => {
    const variantMap = {
        success: "bg-accent hover:bg-accent/80 text-accent-foreground",
        warning: "bg-warning hover:bg-warning/80 text-warning-foreground",
        danger: "bg-destructive hover:bg-destructive/80 text-destructive-foreground",
        pending: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
    };

    return (
        <Badge className={variantMap[status as keyof typeof variantMap]}>
            {label}
        </Badge>
    );
};

interface GoalsTableProps {
    goals?: Goal[];
}

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Goal | 'sectors.name' | 'percentage' | 'difference' | 'statusLabel';


export const GoalsTable = ({ goals: goalsProp }: GoalsTableProps) => {
  const { data: fetchedGoals, isLoading, isError } = useGoals();
  const { mutate: deleteGoal, isPending: isDeleting } = useDeleteGoal();
  
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  
  // Se goalsProp for fornecido, usamos ele (filtrado). Caso contrário, usamos o resultado da query.
  const goals = goalsProp !== undefined ? goalsProp : fetchedGoals;
  const isDataLoading = goalsProp === undefined && isLoading;

  const processedGoals = useMemo(() => {
    return (goals || []).map(goal => ({
      ...goal,
      ...calculatePerformance(goal)
    }));
  }, [goals]);

  const sortedGoals = useMemo(() => {
    let sortableItems = [...processedGoals];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortValue = (item: any, key: SortKey) => {
          if (key === 'sectors.name') return item.sectors?.name?.toLowerCase();
          const value = item[key];
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
  }, [processedGoals, sortConfig]);

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

  const handleDeleteConfirm = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id, {
        onSuccess: () => setGoalToDelete(null),
      });
    }
  };

  if (isDataLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando metas...
      </Card>
    );
  }

  if (isError && goalsProp === undefined) {
    return (
      <Card className="p-6 text-destructive flex items-center">
        <XCircle className="h-5 w-5 mr-2" />
        Erro ao carregar metas.
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Metas Cadastradas
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhamento do desempenho e status das metas por setor.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary [&_th]:text-primary-foreground hover:bg-primary/90">
                <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('sectors.name')}>Setor{renderSortIcon('sectors.name')}</Button></TableHead>
                <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('period_start_date')}>Período{renderSortIcon('period_start_date')}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('target_quantity')}>Meta{renderSortIcon('target_quantity')}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('achieved_quantity')}>Realizado{renderSortIcon('achieved_quantity')}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('percentage')}>%{renderSortIcon('percentage')}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('difference')}>Diferença{renderSortIcon('difference')}</Button></TableHead>
                <TableHead><Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={() => requestSort('statusLabel')}>Status{renderSortIcon('statusLabel')}</Button></TableHead>
                <TableHead className="w-[64px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGoals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhuma meta encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                sortedGoals.map((goal) => {
                  const { percentage, difference, status, statusLabel } = goal;
                  const startDate = format(new Date(goal.period_start_date), "dd/MM/yyyy", { locale: ptBR });
                  const endDate = format(new Date(goal.period_end_date), "dd/MM/yyyy", { locale: ptBR });

                  return (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.sectors.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {startDate} - {endDate} ({goal.period_type === 'monthly' ? 'Mensal' : 'Diário'})
                      </TableCell>
                      <TableCell className="text-right font-semibold">{goal.target_quantity}</TableCell>
                      <TableCell className="text-right">{goal.achieved_quantity}</TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="h-2" />
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={difference < 0 ? "text-destructive" : "text-accent"}>
                          {difference}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} label={statusLabel} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingGoal(goal)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar Realizado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setGoalToDelete(goal)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <UpdateGoalModal 
        isOpen={!!editingGoal}
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
      />
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a meta para o setor "{goalToDelete?.sectors.name}".
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
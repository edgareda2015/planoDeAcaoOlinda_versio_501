import { useState } from "react";
import {
  useExpenseSectors,
  useDeleteExpenseSector,
  useDeleteExpenseBudget,
  useUpdateExpenseBudget,
  ExpenseSector,
} from "@/hooks/useExpenses";
import { useVersion } from "@/contexts/VersionContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Coins,
  History,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExpenseSectorModal } from "@/components/ExpenseSectorModal";

export const ExpenseSectorManager = () => {
  const { activeUnitId, activeVersion } = useVersion();
  const queryClient = useQueryClient();

  const { data: sectors, isLoading: isLoadingSectors } = useExpenseSectors();
  const { mutate: deleteSector, isPending: isDeletingSector } = useDeleteExpenseSector();
  const { mutate: deleteBudget, isPending: isDeletingBudget } = useDeleteExpenseBudget();
  const { mutate: updateBudget, isPending: isUpdatingBudget } = useUpdateExpenseBudget();

  // Estado do Modal unificado
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<ExpenseSector | null>(null);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);

  // Query para histórico de aportes
  const { data: budgetHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["budget_history", activeUnitId, activeVersion],
    queryFn: async () => {
      let query = supabase
        .from("expense_budgets")
        .select(`
          *,
          start_date,
          end_date,
          period_version,
          expense_sectors(name, unit_id)
        `)
        .order("created_at", { ascending: false });

      if (activeVersion !== "all" && activeVersion !== "todos") {
        query = query.eq("period_version", activeVersion);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      if (activeUnitId !== "all") {
        return (data as any[]).filter(
          (item) => item.expense_sectors?.unit_id === activeUnitId
        );
      }
      return data;
    },
  });

  // Abre modal para criação de novo setor
  const handleNewSector = () => {
    setEditingSector(null);
    setEditingBudget(null);
    setModalOpen(true);
  };

  // Abre modal para edição: carrega setor + aporte do período
  const handleEditSector = (sector: ExpenseSector) => {
    setEditingSector(sector);

    // Busca o aporte mais recente desse setor no histórico do período ativo
    const budget = budgetHistory?.find(
      (b: any) => b.sector_id === sector.id
    ) || null;
    setEditingBudget(budget);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSector(null);
    setEditingBudget(null);
    refetchHistory();
  };

  // Excluir setor com confirmação
  const handleDeleteSector = (sector: ExpenseSector) => {
    if (
      window.confirm(
        `⚠️ Deseja realmente excluir o setor "${sector.name}"?\n\nTodas as verbas e despesas associadas a este setor também serão excluídas permanentemente.`
      )
    ) {
      deleteSector(sector.id);
    }
  };

  // Excluir aporte do histórico
  const handleDeleteBudget = (budgetId: string) => {
    if (window.confirm("Deseja realmente excluir este aporte de verba?")) {
      deleteBudget(budgetId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de ação */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Setores & Verbas de Despesa</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os setores, aportes e períodos de vigência de cada verba.
          </p>
        </div>
        <Button
          onClick={handleNewSector}
          className="bg-primary hover:bg-primary/90 shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Setor de Despesa
        </Button>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="list">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="grid w-[420px] grid-cols-2">
            <TabsTrigger value="list">Setores & Verbas Consolidadas</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Aportes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Aba: Setores Consolidados ── */}
        <TabsContent value="list" className="mt-4">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              {isLoadingSectors ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead>Setor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Verba Total</TableHead>
                      <TableHead className="text-right">Gasto Atual</TableHead>
                      <TableHead className="text-right">Saldo Atual</TableHead>
                      <TableHead className="w-[120px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!sectors || sectors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center h-24 text-muted-foreground"
                        >
                          Nenhum setor de despesas cadastrado. Clique em "Novo Setor de Despesa" para começar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sectors.map((sector) => {
                        const pct =
                          sector.budget_received > 0
                            ? (sector.spent_amount / sector.budget_received) * 100
                            : 0;
                        let badgeColor =
                          "bg-green-500/10 text-green-700 dark:text-green-400";
                        if (pct > 90)
                          badgeColor = "bg-red-500/10 text-red-700 dark:text-red-400";
                        else if (pct > 70)
                          badgeColor =
                            "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";

                        return (
                          <TableRow
                            key={sector.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                          >
                            <TableCell className="font-bold text-foreground">
                              <div>{sector.name}</div>
                              <div className="mt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal px-1.5 py-0"
                                >
                                  {sector.accumulates_balance
                                    ? "Acumula Saldo"
                                    : "Não Acumula"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={sector.active ? "success" : "destructive"}
                              >
                                {sector.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-semibold text-primary">
                                {formatCurrency(sector.budget_received)}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Período: {formatCurrency(sector.period_budget_received)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-red-600 font-semibold">
                                {formatCurrency(sector.spent_amount)}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Período: {formatCurrency(sector.period_spent_amount)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                className={cn(badgeColor, "font-bold")}
                                variant="outline"
                              >
                                {formatCurrency(sector.remaining_budget)}
                              </Badge>
                              <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                                Período: {formatCurrency(sector.period_remaining_budget)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Botão Editar → abre modal */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSector(sector)}
                                  title="Editar Setor e Verba"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  disabled={isDeletingSector}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {/* Botão Excluir Setor */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSector(sector)}
                                  title="Excluir Setor"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  disabled={isDeletingSector}
                                >
                                  {isDeletingSector ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba: Histórico de Aportes ── */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-500/5">
                    <TableHead>Data</TableHead>
                    <TableHead>Período de Vigência</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Valor Aportado</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!budgetHistory || budgetHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center h-24 text-muted-foreground"
                      >
                        Nenhum aporte financeiro registrado para este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetHistory.map((item: any) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          {item.start_date && item.end_date ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-semibold">
                                {format(parseISO(item.start_date), "dd/MM/yyyy")}
                              </span>
                              <span className="text-muted-foreground">até</span>
                              <span className="font-semibold">
                                {format(parseISO(item.end_date), "dd/MM/yyyy")}
                              </span>
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {item.period_version}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.expense_sectors?.name || "Desconhecido"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          + {formatCurrency(item.budget_received)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Editar aporte → abre modal com o setor correspondente */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const sector = sectors?.find(
                                  (s) => s.id === item.sector_id
                                );
                                if (sector) {
                                  setEditingSector(sector);
                                  setEditingBudget(item);
                                  setModalOpen(true);
                                }
                              }}
                              title="Editar Aporte"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              disabled={isUpdatingBudget || isDeletingBudget}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {/* Excluir aporte */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBudget(item.id)}
                              title="Excluir Aporte"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={isUpdatingBudget || isDeletingBudget}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Unificado de Setor + Verba */}
      <ExpenseSectorModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        sector={editingSector}
        currentBudget={editingBudget}
      />
    </div>
  );
};

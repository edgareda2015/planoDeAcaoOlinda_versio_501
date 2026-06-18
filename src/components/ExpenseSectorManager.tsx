import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useExpenseSectors, 
  useAddExpenseSector, 
  useUpdateExpenseSector, 
  useAddExpenseBudget,
  useUpdateExpenseBudget,
  useDeleteExpenseBudget,
  ExpenseSector 
} from "@/hooks/useExpenses";
import { 
  ExpenseSectorSchema, 
  ExpenseSectorFormValues,
  ExpenseBudgetSchema,
  ExpenseBudgetFormValues
} from "@/schemas/ExpenseSchema";
import { useVersion } from "@/contexts/VersionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Edit2, Trash2, Coins, ArrowUpRight, History } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const ExpenseSectorManager = () => {
  const { activeUnitId } = useVersion();
  const { profile } = useAuth();
  
  const { data: sectors, isLoading: isLoadingSectors } = useExpenseSectors();
  const { mutate: addSector, isPending: isAddingSector } = useAddExpenseSector();
  const { mutate: updateSector, isPending: isUpdatingSector } = useUpdateExpenseSector();
  const { mutate: addBudget, isPending: isAddingBudget } = useAddExpenseBudget();
  const { mutate: updateBudget, isPending: isUpdatingBudget } = useUpdateExpenseBudget();
  const { mutate: deleteBudget, isPending: isDeletingBudget } = useDeleteExpenseBudget();

  const isAllUnits = activeUnitId === 'all';

  const [editingSector, setEditingSector] = useState<ExpenseSector | null>(null);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [selectedSectorForBudget, setSelectedSectorForBudget] = useState<string>("");

  // Form de Setor
  const sectorForm = useForm<ExpenseSectorFormValues>({
    resolver: zodResolver(ExpenseSectorSchema),
    defaultValues: { name: "", active: true },
  });

  // Form de Aporte de Verba
  const budgetForm = useForm<ExpenseBudgetFormValues>({
    resolver: zodResolver(ExpenseBudgetSchema),
    defaultValues: { sector_id: "", budget_received: 0, description: "" },
  });

  // Query para histórico de aportes
  const { data: budgetHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["budget_history", activeUnitId],
    queryFn: async () => {
      let query = supabase
        .from("expense_budgets")
        .select(`
          *,
          expense_sectors(name, unit_id)
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Filtra por unidade se não for "all"
      if (activeUnitId !== 'all') {
        return (data as any[]).filter(item => item.expense_sectors?.unit_id === activeUnitId);
      }
      return data;
    }
  });

  const onSectorSubmit = (values: ExpenseSectorFormValues) => {
    if (isAllUnits && !editingSector) {
      return;
    }

    if (editingSector) {
      updateSector({ ...values, id: editingSector.id }, {
        onSuccess: () => {
          setEditingSector(null);
          sectorForm.reset({ name: "", active: true });
        }
      });
    } else {
      addSector(values, {
        onSuccess: () => sectorForm.reset({ name: "", active: true }),
      });
    }
  };

  const onBudgetSubmit = (values: ExpenseBudgetFormValues) => {
    if (editingBudget) {
      updateBudget({
        id: editingBudget.id,
        sector_id: values.sector_id,
        budget_received: values.budget_received,
        description: values.description || null
      }, {
        onSuccess: () => {
          setEditingBudget(null);
          budgetForm.reset({ sector_id: "", budget_received: 0, description: "" });
          refetchHistory();
        }
      });
    } else {
      addBudget(values, {
        onSuccess: () => {
          budgetForm.reset({ sector_id: "", budget_received: 0, description: "" });
          refetchHistory();
        }
      });
    }
  };

  const handleEditSector = (sector: ExpenseSector) => {
    setEditingSector(sector);
    sectorForm.reset({
      name: sector.name,
      active: sector.active,
    });
  };

  const handleCancelEdit = () => {
    setEditingSector(null);
    sectorForm.reset({ name: "", active: true });
  };

  const handleEditBudget = (budget: any) => {
    setEditingBudget(budget);
    budgetForm.reset({
      sector_id: budget.sector_id,
      budget_received: Number(budget.budget_received),
      description: budget.description || "",
    });
  };

  const handleCancelEditBudget = () => {
    setEditingBudget(null);
    budgetForm.reset({ sector_id: "", budget_received: 0, description: "" });
  };

  const handleSelectBudgetSector = (sectorId: string) => {
    setSelectedSectorForBudget(sectorId);
    budgetForm.setValue("sector_id", sectorId);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulários */}
        <div className="md:col-span-1 space-y-6">
          {/* Cadastrar/Editar Setor */}
          <Card className="shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {editingSector ? "Editar Setor" : "Novo Setor de Despesa"}
              </CardTitle>
              <CardDescription>
                Setores utilizados para classificar e alocar verbas de despesas.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...sectorForm}>
                <form onSubmit={sectorForm.handleSubmit(onSectorSubmit)} className="space-y-4">
                  <FormField
                    control={sectorForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Setor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Marketing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sectorForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Status Ativo</FormLabel>
                          <div className="text-xs text-muted-foreground">Setores inativos não aparecem no lançamento</div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90" 
                      disabled={isAddingSector || isUpdatingSector || (isAllUnits && !editingSector)}
                    >
                      {(isAddingSector || isUpdatingSector) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingSector ? "Salvar Alterações" : "Criar Setor"}
                    </Button>
                    {editingSector && (
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                  {isAllUnits && !editingSector && (
                    <p className="text-xs text-amber-600 font-semibold text-center">
                      ⚠️ Selecione uma unidade específica no menu lateral para cadastrar setores.
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Lançamento de Verba / Aportes */}
          <Card className="shadow-md">
            <CardHeader className="bg-emerald-500/5">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
                <Coins className="h-5 w-5" />
                {editingBudget ? "Editar Verba (Aporte)" : "Lançar Verba (Aporte)"}
              </CardTitle>
              <CardDescription>
                {editingBudget ? "Altere o valor ou o setor de destino da verba lançada." : "Adicione aportes financeiros a setores ativos da unidade."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...budgetForm}>
                <form onSubmit={budgetForm.handleSubmit(onBudgetSubmit)} className="space-y-4">
                  <FormField
                    control={budgetForm.control}
                    name="sector_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor de Destino</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sectors?.filter(s => s.active || s.id === field.value).map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={budgetForm.control}
                    name="budget_received"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Aporte (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      disabled={isAddingBudget || isUpdatingBudget}
                    >
                      {(isAddingBudget || isUpdatingBudget) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!isAddingBudget && !isUpdatingBudget && <ArrowUpRight className="h-4 w-4 mr-2" />}
                      {editingBudget ? "Salvar Alterações" : "Lançar Aporte"}
                    </Button>
                    {editingBudget && (
                      <Button type="button" variant="outline" onClick={handleCancelEditBudget}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas de Listagem */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="list">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="list">Setores & Verbas Consolidadas</TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Aportes
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Setores Consolidados */}
            <TabsContent value="list" className="mt-4">
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  {isLoadingSectors ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary/5">
                          <TableHead>Setor</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Verba Total</TableHead>
                          <TableHead className="text-right">Gasto Atual</TableHead>
                          <TableHead className="text-right">Saldo Atual</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!sectors || sectors.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhum setor de despesas cadastrado.</TableCell>
                          </TableRow>
                        ) : (
                          sectors.map((sector) => {
                            // Alertas de utilização
                            const pct = sector.budget_received > 0 ? (sector.spent_amount / sector.budget_received) * 100 : 0;
                            let badgeColor = "bg-green-500/10 text-green-700 dark:text-green-400";
                            if (pct > 90) {
                              badgeColor = "bg-red-500/10 text-red-700 dark:text-red-400";
                            } else if (pct > 70) {
                              badgeColor = "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
                            }

                            return (
                              <TableRow key={sector.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                <TableCell className="font-bold text-foreground">{sector.name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={sector.active ? "success" : "destructive"}>
                                    {sector.active ? "Ativo" : "Inativo"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-primary">
                                  {formatCurrency(sector.budget_received)}
                                </TableCell>
                                <TableCell className="text-right text-red-600 font-semibold">
                                  {formatCurrency(sector.spent_amount)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  <Badge className={badgeColor} variant="outline">
                                    {formatCurrency(sector.remaining_budget)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right flex items-center justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditSector(sector)}
                                    title="Editar Setor"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {sector.active && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleSelectBudgetSector(sector.id)}
                                      title="Lançar Verba"
                                      className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                    >
                                      <Coins className="h-4 w-4" />
                                    </Button>
                                  )}
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

            {/* Histórico de Aportes */}
            <TabsContent value="history" className="mt-4">
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-500/5">
                        <TableHead>Data</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="text-right">Valor Aportado</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!budgetHistory || budgetHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum aporte financeiro registrado.</TableCell>
                        </TableRow>
                      ) : (
                        budgetHistory.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-semibold">{item.expense_sectors?.name || "Desconhecido"}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              + {formatCurrency(item.budget_received)}
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-1.5">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditBudget(item)}
                                title="Editar Aporte"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                disabled={isUpdatingBudget || isDeletingBudget}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  if (window.confirm("Deseja realmente excluir este aporte de verba?")) {
                                    deleteBudget(item.id);
                                  }
                                }}
                                title="Excluir Aporte"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={isUpdatingBudget || isDeletingBudget}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </div>
      </div>
    </div>
  );
};

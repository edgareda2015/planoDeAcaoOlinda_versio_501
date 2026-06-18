import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpenseSectorModalSchema, ExpenseSectorModalFormValues } from "@/schemas/ExpenseSchema";
import {
  useAddExpenseSector,
  useUpdateExpenseSector,
  useAddExpenseBudget,
  useUpdateExpenseBudget,
  ExpenseSector,
} from "@/hooks/useExpenses";
import { useVersion } from "@/contexts/VersionContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Building2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ExpenseSectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector?: ExpenseSector | null;
  currentBudget?: any | null; // aporte do período atual (se existir)
}

export const ExpenseSectorModal = ({
  isOpen,
  onClose,
  sector,
  currentBudget,
}: ExpenseSectorModalProps) => {
  const isEditMode = !!sector;
  const { activeUnitId } = useVersion();
  const isAllUnits = activeUnitId === "all";

  const { mutate: addSector, isPending: isAddingSector } = useAddExpenseSector();
  const { mutate: updateSector, isPending: isUpdatingSector } = useUpdateExpenseSector();
  const { mutate: addBudget, isPending: isAddingBudget } = useAddExpenseBudget();
  const { mutate: updateBudget, isPending: isUpdatingBudget } = useUpdateExpenseBudget();

  const autoToggledRef = useRef<string | null>(null);

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const form = useForm<ExpenseSectorModalFormValues>({
    resolver: zodResolver(ExpenseSectorModalSchema),
    defaultValues: {
      name: "",
      active: true,
      accumulates_balance: true,
      budget_value: 0,
      start_date: today,
      end_date: nextMonth,
    },
  });

  // Carregar valores ao abrir modal em modo edição
  useEffect(() => {
    if (isOpen) {
      if (sector) {
        form.reset({
          name: sector.name,
          active: sector.active,
          accumulates_balance: sector.accumulates_balance,
          budget_value: currentBudget ? Number(currentBudget.budget_received) : 0,
          start_date: currentBudget?.start_date ? parseISO(currentBudget.start_date) : today,
          end_date: currentBudget?.end_date ? parseISO(currentBudget.end_date) : nextMonth,
        });
      } else {
        form.reset({
          name: "",
          active: true,
          accumulates_balance: true,
          budget_value: 0,
          start_date: today,
          end_date: nextMonth,
        });
      }
      autoToggledRef.current = null;
    }
  }, [isOpen, sector, currentBudget]);

  // Sugestão automática para o setor "Administração"
  const nameValue = form.watch("name");
  useEffect(() => {
    const trimmed = nameValue?.trim().toLowerCase();
    const isAdministracao = trimmed === "administração" || trimmed === "administracao";
    if (isAdministracao && autoToggledRef.current !== trimmed) {
      form.setValue("accumulates_balance", false);
      autoToggledRef.current = trimmed;
    } else if (!isAdministracao && autoToggledRef.current) {
      form.setValue("accumulates_balance", true);
      autoToggledRef.current = null;
    }
  }, [nameValue, form]);

  const isPending = isAddingSector || isUpdatingSector || isAddingBudget || isUpdatingBudget;

  const onSubmit = (values: ExpenseSectorModalFormValues) => {
    if (isEditMode && sector) {
      // Atualizar setor
      updateSector(
        { id: sector.id, name: values.name, active: values.active, accumulates_balance: values.accumulates_balance },
        {
          onSuccess: () => {
            // Atualizar ou criar verba se houver valor
            if (values.budget_value > 0) {
              if (currentBudget) {
                updateBudget(
                  {
                    id: currentBudget.id,
                    sector_id: sector.id,
                    budget_received: values.budget_value,
                    start_date: values.start_date,
                    end_date: values.end_date,
                  },
                  { onSuccess: () => onClose() }
                );
              } else {
                addBudget(
                  {
                    sector_id: sector.id,
                    budget_received: values.budget_value,
                    start_date: values.start_date,
                    end_date: values.end_date,
                  },
                  { onSuccess: () => onClose() }
                );
              }
            } else {
              onClose();
            }
          },
        }
      );
    } else {
      // Criar novo setor
      addSector(
        { name: values.name, active: values.active, accumulates_balance: values.accumulates_balance },
        {
          onSuccess: (newSector: any) => {
            if (values.budget_value > 0 && newSector?.id) {
              addBudget(
                {
                  sector_id: newSector.id,
                  budget_received: values.budget_value,
                  start_date: values.start_date,
                  end_date: values.end_date,
                },
                { onSuccess: () => onClose() }
              );
            } else {
              onClose();
            }
          },
        }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {isEditMode ? "Editar Setor de Despesa" : "Novo Setor de Despesa"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Altere os dados do setor, o valor da verba e o período de vigência."
              : "Preencha os dados do setor e defina a verba inicial para o período."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* ─── Seção: Dados do Setor ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Building2 className="h-4 w-4" />
                Dados do Setor
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Setor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Marketing, Gente, TI..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Status Ativo</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Inativos não aparecem no lançamento
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accumulates_balance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Acumula Saldo?</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Saldo restante passa para o próximo período
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ─── Seção: Verba do Período ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <Coins className="h-4 w-4" />
                Verba do Período
              </div>

              <FormField
                control={form.control}
                name="budget_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Verba (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vigência Inicial *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                : <span>Selecione</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vigência Final *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                                : <span>Selecione</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isAllUnits && !isEditMode && (
                <p className="text-xs text-amber-600 font-semibold text-center bg-amber-50 border border-amber-200 rounded-lg p-2">
                  ⚠️ Selecione uma unidade específica no menu lateral para cadastrar setores.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || (isAllUnits && !isEditMode)}
                className="bg-primary hover:bg-primary/90 min-w-[140px]"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Criar Setor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

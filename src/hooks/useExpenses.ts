import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseFormValues, ExpenseSectorFormValues, ExpenseBudgetFormValues } from "@/schemas/ExpenseSchema";

// --- Interfaces ---
export interface ExpenseSector {
  id: string;
  name: string;
  active: boolean;
  unit_id: string | null;
  created_at: string;
  accumulates_balance: boolean;
  budget_received: number; // calculated
  spent_amount: number;    // calculated
  remaining_budget: number; // calculated
  period_budget_received: number; // strictly current period
  period_spent_amount: number;    // strictly current period
  period_remaining_budget: number; // strictly current period
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export interface Expense {
  id: string;
  sector_id: string;
  purchase_date: string;
  value: number;
  description: string;
  ticket_number: string;
  ticket_date: string;
  status: string;
  observation: string | null;
  created_by: string | null;
  unit_id: string | null;
  period_version: string;
  deleted_at: string | null;
  created_at: string;
  expense_sectors?: {
    name: string;
    active: boolean;
  } | null;
  expense_attachments?: ExpenseAttachment[];
}

// --- Status Fetcher ---
const fetchExpenseStatuses = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("expense_statuses")
    .select("name")
    .eq("active", true)
    .order("name");
  
  if (error) throw new Error(error.message);
  return data.map((s: any) => s.name);
};

export const useExpenseStatuses = () => {
  return useQuery<string[], Error>({
    queryKey: ["expense_statuses"],
    queryFn: fetchExpenseStatuses,
    staleTime: 1000 * 60 * 30, // 30 mins
  });
};

// --- Sectors Fetcher ---
const fetchExpenseSectors = async (unitId: string, version: string): Promise<ExpenseSector[]> => {
  // Se for "all" (Visão Global), buscamos todos os setores
  let query = supabase
    .from("expense_sectors")
    .select(`
      *,
      expense_budgets(budget_received, period_version, start_date, end_date),
      expenses(value, status, deleted_at, period_version, purchase_date)
    `);

  if (unitId !== 'all') {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);

  const isAll = version === 'all' || version === 'todos';

  return (data as any[]).map(sector => {
    // Buscar as datas do período do orçamento atual (para setores "Não Acumula")
    const currentPeriodBudgets = sector.expense_budgets
      ?.filter((b: any) => b.period_version === version) || [];

    // Determinar intervalo de datas do período atual a partir dos budgets
    let periodStartDate: string | null = null;
    let periodEndDate: string | null = null;
    for (const b of currentPeriodBudgets) {
      if (b.start_date && (!periodStartDate || b.start_date < periodStartDate)) {
        periodStartDate = b.start_date;
      }
      if (b.end_date && (!periodEndDate || b.end_date > periodEndDate)) {
        periodEndDate = b.end_date;
      }
    }

    // Helper: verifica se a purchase_date da despesa cai dentro do período do budget
    const isExpenseInPeriodDates = (e: any): boolean => {
      if (!e.purchase_date || !periodStartDate || !periodEndDate) return false;
      return e.purchase_date >= periodStartDate && e.purchase_date <= periodEndDate;
    };

    // Para "Não Acumula": filtra por datas do período (start_date/end_date do budget).
    // Se não tiver datas no budget, faz fallback para period_version.
    const hasPeriodDates = !!periodStartDate && !!periodEndDate;

    // 1. Lógica do período atual
    const period_budget_received = sector.expense_budgets
      ?.filter((b: any) => isAll || b.period_version === version)
      ?.reduce((sum: number, b: any) => sum + Number(b.budget_received), 0) || 0;

    // Para setores "Não Acumula" com datas definidas, filtramos por purchase_date
    const periodExpenseFilter = (e: any): boolean => {
      if (e.deleted_at !== null || e.status === 'Cancelado') return false;
      if (isAll) return true;
      if (!sector.accumulates_balance && hasPeriodDates) {
        return isExpenseInPeriodDates(e);
      }
      return e.period_version === version;
    };

    const period_spent_amount = sector.expenses
      ?.filter(periodExpenseFilter)
      ?.reduce((sum: number, e: any) => sum + Number(e.value), 0) || 0;

    const period_remaining_budget = period_budget_received - period_spent_amount;

    // 2. Lógica acumulada (depende de sector.accumulates_balance)
    let budget_received = 0;
    let spent_amount = 0;

    if (isAll) {
      budget_received = period_budget_received;
      spent_amount = period_spent_amount;
    } else if (sector.accumulates_balance) {
      // Acumula: soma todos os períodos menores ou iguais ao selecionado
      budget_received = sector.expense_budgets
        ?.filter((b: any) => b.period_version && b.period_version <= version)
        ?.reduce((sum: number, b: any) => sum + Number(b.budget_received), 0) || 0;

      spent_amount = sector.expenses
        ?.filter((e: any) => e.deleted_at === null && e.status !== 'Cancelado' && e.period_version && e.period_version <= version)
        ?.reduce((sum: number, e: any) => sum + Number(e.value), 0) || 0;
    } else {
      // Não acumula: usa filtro por datas do período (se disponíveis)
      budget_received = period_budget_received;
      spent_amount = period_spent_amount;
    }

    const remaining_budget = budget_received - spent_amount;

    return {
      ...sector,
      budget_received,
      spent_amount,
      remaining_budget,
      period_budget_received,
      period_spent_amount,
      period_remaining_budget
    };
  });
};

export const useExpenseSectors = () => {
  const { activeUnitId, activeVersion } = useVersion();
  return useQuery<ExpenseSector[], Error>({
    queryKey: ["expense_sectors", activeUnitId, activeVersion],
    queryFn: () => fetchExpenseSectors(activeUnitId, activeVersion),
  });
};

// --- CRUD Setores ---
export const useAddExpenseSector = () => {
  const queryClient = useQueryClient();
  const { activeUnitId } = useVersion();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (values: ExpenseSectorFormValues) => {
      const effectiveUnitId = (profile?.role === 'diretor_unidade' && profile?.unit_id) 
        ? profile.unit_id 
        : (activeUnitId === 'all' ? null : activeUnitId);

      const { data, error } = await supabase
        .from("expense_sectors")
        .insert({
          name: values.name,
          active: values.active,
          accumulates_balance: values.accumulates_balance,
          unit_id: effectiveUnitId
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      toast.success("Setor de despesa cadastrado com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao cadastrar setor: ${error.message}`),
  });
};

export const useUpdateExpenseSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExpenseSectorFormValues> & { id: string }) => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from("expense_sectors")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      toast.success("Setor atualizado com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao atualizar setor: ${error.message}`),
  });
};

// --- Aporte de Verba ---
export const useAddExpenseBudget = () => {
  const queryClient = useQueryClient();
  const { activeVersion } = useVersion();
  return useMutation({
    mutationFn: async (values: ExpenseBudgetFormValues) => {
      let versionToUse = activeVersion;
      if (versionToUse === 'all' || versionToUse === 'todos') {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'default_semester')
          .maybeSingle();
        versionToUse = setting?.value || `${new Date().getFullYear()}.${new Date().getMonth() < 6 ? 1 : 2}`;
      }

      const { data, error } = await supabase
        .from("expense_budgets")
        .insert({
          sector_id: values.sector_id,
          budget_received: values.budget_received,
          description: values.description || null,
          period_version: versionToUse,
          start_date: values.start_date.toISOString().split("T")[0],
          end_date: values.end_date.toISOString().split("T")[0]
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      queryClient.invalidateQueries({ queryKey: ["budget_history"] });
      toast.success("Aporte de verba lançado com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao lançar verba: ${error.message}`),
  });
};

export const useUpdateExpenseBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; sector_id: string; budget_received: number; description?: string | null; start_date: Date; end_date: Date }) => {
      const { data, error } = await supabase
        .from("expense_budgets")
        .update({
          sector_id: payload.sector_id,
          budget_received: payload.budget_received,
          description: payload.description || null,
          start_date: payload.start_date.toISOString().split("T")[0],
          end_date: payload.end_date.toISOString().split("T")[0]
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      queryClient.invalidateQueries({ queryKey: ["budget_history"] });
      toast.success("Aporte de verba atualizado com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao atualizar verba: ${error.message}`),
  });
};

export const useDeleteExpenseBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_budgets")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      queryClient.invalidateQueries({ queryKey: ["budget_history"] });
      toast.success("Aporte de verba excluído com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao excluir verba: ${error.message}`),
  });
};

// --- Expenses Fetcher ---
const fetchExpenses = async (unitId: string, version: string): Promise<Expense[]> => {
  let query = supabase
    .from("expenses")
    .select(`
      *,
      expense_sectors(name, active),
      expense_attachments(*)
    `)
    .is("deleted_at", null); // Filtro Soft Delete

  if (unitId !== 'all') {
    query = query.eq("unit_id", unitId);
  }

  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }

  const { data, error } = await query.order("purchase_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Expense[];
};

export const useExpenses = () => {
  const { activeUnitId, activeVersion } = useVersion();
  return useQuery<Expense[], Error>({
    queryKey: ["expenses", activeUnitId, activeVersion],
    queryFn: () => fetchExpenses(activeUnitId, activeVersion),
  });
};

// --- CRUD Despesas ---
export const useAddExpense = () => {
  const queryClient = useQueryClient();
  const { activeUnitId, activeVersion } = useVersion();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: { formValues: ExpenseFormValues; attachments: File[] }) => {
      if (!profile) throw new Error("Usuário não autenticado.");

      const effectiveUnitId = (profile?.role === 'diretor_unidade' && profile?.unit_id) 
        ? profile.unit_id 
        : (activeUnitId === 'all' ? null : activeUnitId);

      let versionToUse = activeVersion;
      if (versionToUse === 'all' || versionToUse === 'todos') {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'default_semester')
          .maybeSingle();
        versionToUse = setting?.value || `${new Date().getFullYear()}.${new Date().getMonth() < 6 ? 1 : 2}`;
      }

      // 1. Cadastra a despesa
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          sector_id: payload.formValues.sector_id,
          purchase_date: payload.formValues.purchase_date.toISOString().split("T")[0],
          value: payload.formValues.value,
          description: payload.formValues.description,
          ticket_number: payload.formValues.ticket_number || null,
          ticket_date: payload.formValues.ticket_date ? payload.formValues.ticket_date.toISOString().split("T")[0] : null,
          status: payload.formValues.status,
          observation: payload.formValues.observation || null,
          created_by: profile.id,
          unit_id: effectiveUnitId,
          period_version: versionToUse
        })
        .select()
        .single();

      if (expenseError) throw new Error(expenseError.message);

      // 2. Faz upload dos anexos
      for (const file of payload.attachments) {
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExt = file.name.split(".").pop();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const path = `expenses/${expense.id}/${randomId}_${safeFileName}`;

        // Upload no Bucket "evidences"
        const { error: uploadError } = await supabase.storage
          .from("evidences")
          .upload(path, file, { cacheControl: "3600", upsert: true });

        if (uploadError) throw new Error(`Falha no upload de ${file.name}: ${uploadError.message}`);

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from("evidences").getPublicUrl(path);

        // Insere registro de anexo no DB
        const { error: attachError } = await supabase
          .from("expense_attachments")
          .insert({
            expense_id: expense.id,
            file_name: file.name,
            file_path: path,
            file_type: fileExt || "unknown"
          });

        if (attachError) throw new Error(`Falha ao registrar anexo no banco: ${attachError.message}`);
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      toast.success("Despesa cadastrada com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao cadastrar despesa: ${error.message}`),
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; formValues: Partial<ExpenseFormValues>; newAttachments: File[] }) => {
      const { id, formValues, newAttachments } = payload;
      
      const updateData: any = { ...formValues };
      if (formValues.purchase_date) {
        updateData.purchase_date = formValues.purchase_date instanceof Date ? formValues.purchase_date.toISOString().split("T")[0] : formValues.purchase_date;
      }
      
      updateData.ticket_date = formValues.ticket_date && formValues.ticket_date instanceof Date 
        ? formValues.ticket_date.toISOString().split("T")[0] 
        : null;

      updateData.ticket_number = formValues.ticket_number || null;


      // 1. Atualiza dados da despesa
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (expenseError) throw new Error(expenseError.message);

      // 2. Upload de novos anexos
      for (const file of newAttachments) {
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExt = file.name.split(".").pop();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const path = `expenses/${id}/${randomId}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("evidences")
          .upload(path, file, { cacheControl: "3600", upsert: true });

        if (uploadError) throw new Error(`Falha no upload de ${file.name}: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from("evidences").getPublicUrl(path);

        const { error: attachError } = await supabase
          .from("expense_attachments")
          .insert({
            expense_id: id,
            file_name: file.name,
            file_path: path,
            file_type: fileExt || "unknown"
          });

        if (attachError) throw new Error(`Falha ao registrar anexo no banco: ${attachError.message}`);
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      toast.success("Despesa atualizada com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao atualizar despesa: ${error.message}`),
  });
};

// Exclusão lógica (Soft Delete)
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { data, error } = await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() }) // Marca deleted_at para soft delete
        .eq("id", expenseId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      toast.success("Despesa excluída com sucesso (Soft Delete)!");
    },
    onError: (error: any) => toast.error(`Erro ao excluir despesa: ${error.message}`),
  });
};

// --- Exclusão de Anexos ---
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { attachmentId: string; filePath: string }) => {
      // 1. Remove arquivo do Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("evidences")
        .remove([payload.filePath]);

      if (storageError) {
        console.error("Erro ao remover do storage (continuando deleção no banco):", storageError.message);
      }

      // 2. Remove registro do DB
      const { error: dbError } = await supabase
        .from("expense_attachments")
        .delete()
        .eq("id", payload.attachmentId);

      if (dbError) throw new Error(dbError.message);
      return payload.attachmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Anexo excluído com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao excluir anexo: ${error.message}`),
  });
};

export const useDeleteExpenseSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sectorId: string) => {
      const { error } = await supabase
        .from("expense_sectors")
        .delete()
        .eq("id", sectorId);

      if (error) throw new Error(error.message);
      return sectorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_sectors"] });
      queryClient.invalidateQueries({ queryKey: ["budget_history"] });
      toast.success("Setor excluído com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao excluir setor: ${error.message}`),
  });
};

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
  budget_received: number; // calculated
  spent_amount: number;    // calculated
  remaining_budget: number; // calculated
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
const fetchExpenseSectors = async (unitId: string): Promise<ExpenseSector[]> => {
  // Se for "all" (Visão Global), buscamos todos os setores
  let query = supabase
    .from("expense_sectors")
    .select(`
      *,
      expense_budgets(budget_received),
      expenses(value, status, deleted_at)
    `);

  if (unitId !== 'all') {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);

  return (data as any[]).map(sector => {
    const budget_received = sector.expense_budgets?.reduce((sum: number, b: any) => sum + Number(b.budget_received), 0) || 0;
    // Gasto atual desconsidera despesas soft-deleted e canceladas
    const spent_amount = sector.expenses
      ?.filter((e: any) => e.deleted_at === null && e.status !== 'Cancelado')
      ?.reduce((sum: number, e: any) => sum + Number(e.value), 0) || 0;
    const remaining_budget = budget_received - spent_amount;

    return {
      ...sector,
      budget_received,
      spent_amount,
      remaining_budget
    };
  });
};

export const useExpenseSectors = () => {
  const { activeUnitId } = useVersion();
  return useQuery<ExpenseSector[], Error>({
    queryKey: ["expense_sectors", activeUnitId],
    queryFn: () => fetchExpenseSectors(activeUnitId),
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
  return useMutation({
    mutationFn: async (values: ExpenseBudgetFormValues) => {
      const { data, error } = await supabase
        .from("expense_budgets")
        .insert({
          sector_id: values.sector_id,
          budget_received: values.budget_received,
          description: values.description || null
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
    mutationFn: async (payload: { id: string; sector_id: string; budget_received: number; description?: string | null }) => {
      const { data, error } = await supabase
        .from("expense_budgets")
        .update({
          sector_id: payload.sector_id,
          budget_received: payload.budget_received,
          description: payload.description || null
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
          period_version: activeVersion === 'all' || activeVersion === 'todos' ? '2026.1' : activeVersion
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";

// E-mails conhecidos do administrador master (Edgar)
const EXPENSE_ADMIN_EMAILS = [
  "edgar.tavares@mauriciodenassau.edu.br",
  "edgareda2015@gmail.com",
];

interface ExpenseAccessEntry {
  id: string;
  email: string;
  granted_by: string;
  created_at: string;
}

// --- Buscar lista de e-mails com acesso ---
export const useExpenseAccessList = () => {
  return useQuery<ExpenseAccessEntry[], Error>({
    queryKey: ["expense_access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_access")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Tabela 'expense_access' ainda não criada ou erro de consulta:", error.message);
        return [];
      }
      return (data || []) as ExpenseAccessEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};

// --- Verificar se o usuário logado é o admin master de despesas ---
export const useIsExpenseAdmin = () => {
  const { user: clerkUser } = useUser();
  const { profile } = useAuth();
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (profile?.role === "admin") return true;
  if (userEmail && EXPENSE_ADMIN_EMAILS.includes(userEmail)) return true;

  return false;
};

// --- Verificar se o usuário logado tem acesso ao Cartão de Despesas ---
export const useHasExpenseAccess = () => {
  const { user: clerkUser } = useUser();
  const { profile } = useAuth();
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isExpenseAdmin = useIsExpenseAdmin();

  return useQuery<boolean, Error>({
    queryKey: ["expense_access_check", userEmail, isExpenseAdmin, profile?.role],
    queryFn: async () => {
      // Admin master (Edgar) e admins globais SEMPRE têm acesso automático ao Cartão de Despesas!
      if (isExpenseAdmin || profile?.role === "admin") return true;
      if (userEmail && EXPENSE_ADMIN_EMAILS.includes(userEmail)) return true;
      if (!userEmail) return false;

      const { data, error } = await supabase
        .from("expense_access")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao verificar tabela expense_access:", error.message);
        // Em caso de erro (ex: tabela ainda não criada), se for admin dá acesso
        return profile?.role === "admin";
      }

      return !!data;
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
};

// --- Adicionar acesso ---
export const useAddExpenseAccess = () => {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async (email: string) => {
      const grantedBy = clerkUser?.primaryEmailAddress?.emailAddress || EXPENSE_ADMIN_EMAILS[0];

      const { data, error } = await supabase
        .from("expense_access")
        .insert({
          email: email.toLowerCase().trim(),
          granted_by: grantedBy,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este e-mail já possui acesso.");
        }
        if (error.code === "42P01") {
          throw new Error("A tabela 'expense_access' ainda não foi criada no Supabase.");
        }
        if (error.message?.includes("row-level security") || error.code === "42501") {
          throw new Error("A política de RLS bloqueou a alteração. Execute o SQL de permissão no console do Supabase.");
        }
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_access"] });
      queryClient.invalidateQueries({ queryKey: ["expense_access_check"] });
      toast.success("Acesso concedido com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conceder acesso: ${error.message}`);
    },
  });
};

// --- Remover acesso ---
export const useRemoveExpenseAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      // Impedir remoção dos admins masters
      if (EXPENSE_ADMIN_EMAILS.includes(email.toLowerCase())) {
        throw new Error("Não é possível remover o acesso do administrador principal.");
      }

      const { error } = await supabase
        .from("expense_access")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.message?.includes("row-level security") || error.code === "42501") {
          throw new Error("A política de RLS bloqueou a exclusão. Execute o SQL de permissão no console do Supabase.");
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_access"] });
      queryClient.invalidateQueries({ queryKey: ["expense_access_check"] });
      toast.success("Acesso removido com sucesso.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover acesso: ${error.message}`);
    },
  });
};

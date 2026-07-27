import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";

// E-mail do administrador master que gerencia o acesso ao Cartão de Despesas
const EXPENSE_ADMIN_EMAIL = "edgar.tavares@mauriciodenassau.edu.br";

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

      if (error) throw new Error(error.message);
      return data as ExpenseAccessEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};

// --- Verificar se o usuário logado tem acesso ao Cartão de Despesas ---
export const useHasExpenseAccess = () => {
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();

  return useQuery<boolean, Error>({
    queryKey: ["expense_access_check", userEmail],
    queryFn: async () => {
      if (!userEmail) return false;

      const { data, error } = await supabase
        .from("expense_access")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar acesso a despesas:", error.message);
        return false;
      }

      return !!data;
    },
    enabled: !!userEmail,
    staleTime: 1000 * 60 * 5,
  });
};

// --- Verificar se o usuário logado é o admin master de despesas ---
export const useIsExpenseAdmin = () => {
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return userEmail === EXPENSE_ADMIN_EMAIL;
};

// --- Adicionar acesso ---
export const useAddExpenseAccess = () => {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async (email: string) => {
      const grantedBy = clerkUser?.primaryEmailAddress?.emailAddress || EXPENSE_ADMIN_EMAIL;

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
      // Impedir remoção do admin master
      if (email.toLowerCase() === EXPENSE_ADMIN_EMAIL) {
        throw new Error("Não é possível remover o acesso do administrador principal.");
      }

      const { error } = await supabase
        .from("expense_access")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
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

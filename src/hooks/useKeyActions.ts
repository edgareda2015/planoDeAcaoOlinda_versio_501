import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KeyActionFormValues } from "@/schemas/KeyActionSchema";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";

// --- Tipos ---
export interface KeyAction {
  id: string;
  user_id: string | null;
  course: string;
  target: string;
  action_date: string; // ISO date string
  expected_enrollments: number;
  expected_leads: number;
  budget_percentage: number;
  created_at: string;
}

// --- Funções de API ---
const fetchKeyActions = async (version: string): Promise<KeyAction[]> => {
  let query = supabase.from("key_actions").select("*");
  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }
  const { data, error } = await query.order("action_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const insertKeyAction = async (actionData: KeyActionFormValues, version: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("key_actions").insert({ 
    ...actionData, 
    user_id: user?.id,
    action_date: actionData.action_date.toISOString().split('T')[0],
    period_version: version,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateKeyAction = async (actionData: Partial<KeyActionFormValues> & { id: string }) => {
  const { id, ...updateData } = actionData;
  
  const dbUpdateData: { [key: string]: any } = { ...updateData };
  if (updateData.action_date && updateData.action_date instanceof Date) {
    dbUpdateData.action_date = updateData.action_date.toISOString().split('T')[0];
  }

  const { data, error } = await supabase.from("key_actions").update(dbUpdateData).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteKeyAction = async (actionId: string) => {
  const { error } = await supabase.from("key_actions").delete().eq("id", actionId);
  if (error) throw new Error(error.message);
  return actionId;
};

// --- Hooks ---
export const useKeyActions = () => {
  const { activeVersion } = useVersion();
  return useQuery<KeyAction[], Error>({ queryKey: ["key_actions", activeVersion], queryFn: () => fetchKeyActions(activeVersion) });
};

export const useAddKeyAction = () => {
  const queryClient = useQueryClient();
  const { activeVersion } = useVersion();
  return useMutation({
    mutationFn: (data: KeyActionFormValues) => insertKeyAction(data, activeVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_actions"] });
      toast.success("Ação principal criada com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao criar ação: ${error.message}`),
  });
};

export const useUpdateKeyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateKeyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_actions"] });
      toast.success("Ação principal atualizada com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao atualizar ação: ${error.message}`),
  });
};

export const useDeleteKeyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteKeyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_actions"] });
      toast.success("Ação principal excluída com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao excluir ação: ${error.message}`),
  });
};
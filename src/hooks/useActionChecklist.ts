import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";

// --- Types ---
export interface ChecklistItem {
  id: string;
  action_id: string;
  description: string;
  is_completed: boolean;
}

// --- API Functions ---
const fetchChecklistItems = async (actionId: string): Promise<ChecklistItem[]> => {
  const { data, error } = await supabase
    .from("action_checklist_items")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const addChecklistItem = async ({ actionId, description, version }: { actionId: string; description: string; version: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("action_checklist_items")
    .insert({ action_id: actionId, description, user_id: user?.id, period_version: version })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const updateChecklistItem = async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
  const { data, error } = await supabase
    .from("action_checklist_items")
    .update({ is_completed })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteChecklistItem = async (id: string) => {
  const { error } = await supabase.from("action_checklist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return id;
};

// --- Hooks ---
export const useActionChecklist = (actionId: string) => {
  return useQuery<ChecklistItem[], Error>({
    queryKey: ["checklist", actionId],
    queryFn: () => fetchChecklistItems(actionId),
    enabled: !!actionId,
  });
};

export const useAddChecklistItem = () => {
  const queryClient = useQueryClient();
  const { activeVersion } = useVersion();
  return useMutation<any, Error, { actionId: string; description: string }>({
    mutationFn: (data) => addChecklistItem({ ...data, version: activeVersion }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", data.action_id] });
    },
    onError: (error) => toast.error(`Erro ao adicionar item: ${error.message}`),
  });
};

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; is_completed: boolean; action_id: string }>({
    mutationFn: updateChecklistItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", data.action_id] });
    },
    onError: (error) => toast.error(`Erro ao atualizar item: ${error.message}`),
  });
};

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { id: string; action_id: string }>({
    mutationFn: ({ id }) => deleteChecklistItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.action_id] });
    },
    onError: (error) => toast.error(`Erro ao excluir item: ${error.message}`),
  });
};
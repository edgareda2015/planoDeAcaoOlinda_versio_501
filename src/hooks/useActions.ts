import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActionFormValues } from "@/schemas/ActionSchema";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";

// --- Tipos ---
export interface Responsible {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export type ActionStatus = "planning" | "partial" | "completed" | "delayed" | "cancelled";

export interface Action {
  id: string;
  user_id: string;
  sector_id: string;
  goal_id: string | null;
  description: string;
  how_to_do: string | null;
  responsible_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ActionStatus;
  evidence_url: string | null;
  created_at: string;
  unidade: string | null; // Novo campo
  sectors: { name: string; type: 'matricula' | 'coordenacao' | 'administrativo' };
}

// --- Funções de API ---
const fetchResponsibles = async (): Promise<Responsible[]> => {
  const { data, error } = await supabase.from("responsibles").select("*").order("first_name");
  if (error) throw new Error(error.message);
  return data as Responsible[];
};

const fetchActions = async (version: string): Promise<Action[]> => {
  let query = supabase
    .from("actions")
    .select(`*, sectors(name, type)`);
    
  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }

  const { data, error } = await query
    .order("name", { foreignTable: "sectors", ascending: true }) // Ordena pelo nome do setor (A-Z)
    .order("created_at", { ascending: false }); // Depois, pela data de criação
  if (error) throw new Error(error.message);
  return data as Action[];
};

const insertAction = async (actionData: ActionFormValues, version: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("actions").insert({
    user_id: user?.id,
    ...actionData,
    goal_id: (actionData.goal_id === 'null' || !actionData.goal_id) ? null : actionData.goal_id,
    how_to_do: actionData.how_to_do || null,
    start_date: actionData.start_date ? actionData.start_date.toISOString().split('T')[0] : null,
    end_date: actionData.end_date ? actionData.end_date.toISOString().split('T')[0] : null,
    evidence_url: actionData.evidence_url || null,
    period_version: version,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateAction = async (actionData: Partial<ActionFormValues> & { id: string }) => {
  const { id, ...updateData } = actionData;
  
  const dbUpdateData: { [key: string]: any } = { ...updateData };

  if ('goal_id' in dbUpdateData) {
    const goalId = dbUpdateData.goal_id;
    dbUpdateData.goal_id = (goalId === 'null' || !goalId) ? null : goalId;
  }

  const { data, error } = await supabase.from("actions").update(dbUpdateData).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteAction = async (actionId: string) => {
  const { error } = await supabase.from("actions").delete().eq("id", actionId);
  if (error) throw new Error(error.message);
  return actionId;
};

// --- Hooks ---
export const useResponsibles = () => {
  return useQuery<Responsible[], Error>({ queryKey: ["responsibles"], queryFn: fetchResponsibles });
};

export const useActions = () => {
  const { activeVersion } = useVersion();
  return useQuery<Action[], Error>({ queryKey: ["actions", activeVersion], queryFn: () => fetchActions(activeVersion) });
};

export const useAddAction = () => {
  const queryClient = useQueryClient();
  const { activeVersion } = useVersion();
  return useMutation({
    mutationFn: (data: ActionFormValues) => insertAction(data, activeVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Ação cadastrada com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao cadastrar ação: ${error.message}`),
  });
};

export const useUpdateAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Ação atualizada com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao atualizar ação: ${error.message}`),
  });
};

export const useDeleteAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Ação excluída com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao excluir ação: ${error.message}`),
  });
};
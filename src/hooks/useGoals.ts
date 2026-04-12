import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoalFormValues } from "@/schemas/GoalSchema";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";

// --- Tipos ---
export interface Sector {
  id: string;
  name: string;
  type: 'matricula' | 'coordenacao' | 'administrativo';
}

export interface Goal {
  id: string;
  sector_id: string;
  target_quantity: number;
  achieved_quantity: number;
  period_type: "monthly" | "daily";
  period_start_date: string; // ISO date string
  period_end_date: string; // ISO date string
  created_at: string;
  sectors: Sector; // Relação com a tabela sectors
}

// --- Funções de API ---

// 1. Buscar Setores
const fetchSectors = async (): Promise<Sector[]> => {
  const { data, error } = await supabase.from("sectors").select("id, name, type").order("name");
  if (error) throw new Error(error.message);
  return data as Sector[];
};

// 2. Buscar Metas
const fetchGoals = async (version: string): Promise<Goal[]> => {
  let query = supabase
    .from("goals")
    .select("*, sectors(id, name, type)");

  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }

  const { data, error } = await query.order("period_start_date", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data as Goal[];
};

// 3. Inserir Meta (para a página de Metas)
const insertGoal = async (goalData: GoalFormValues, version: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from("goals").insert({
    user_id: user?.id,
    sector_id: goalData.sector_id,
    target_quantity: goalData.target_quantity,
    period_type: goalData.period_type,
    period_start_date: goalData.period_start_date.toISOString().split('T')[0],
    period_end_date: goalData.period_end_date.toISOString().split('T')[0],
    achieved_quantity: 0, // Novas metas sempre começam com 0
    period_version: version,
  }).select().single();

  if (error) throw new Error(error.message);
  return data;
};

// 4. Atualizar Meta
const updateGoal = async ({ id, achieved_quantity }: { id: string; achieved_quantity: number }) => {
  const { data, error } = await supabase
    .from("goals")
    .update({ achieved_quantity })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// 5. Deletar Meta
const deleteGoal = async (goalId: string) => {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  return goalId;
};


// --- Hooks ---

export const useSectors = () => {
  return useQuery<Sector[], Error>({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
  });
};

export const useGoals = () => {
  const { activeVersion } = useVersion();
  return useQuery<Goal[], Error>({
    queryKey: ["goals", activeVersion],
    queryFn: () => fetchGoals(activeVersion),
  });
};

export const useAddGoal = () => {
  const queryClient = useQueryClient();
  const { activeVersion } = useVersion();
  return useMutation<any, Error, GoalFormValues>({
    mutationFn: (data: GoalFormValues) => insertGoal(data, activeVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar meta: ${error.message}`);
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; achieved_quantity: number }>({
    mutationFn: updateGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Valor realizado atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir meta: ${error.message}`);
    },
  });
};

export const useSectorIdByName = (name: string) => {
  return useQuery<string | undefined, Error>({
    queryKey: ["sectorId", name],
    queryFn: async () => {
      const sectors = await fetchSectors();
      const sector = sectors.find(s => s.name.toUpperCase() === name.toUpperCase());
      return sector?.id;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};
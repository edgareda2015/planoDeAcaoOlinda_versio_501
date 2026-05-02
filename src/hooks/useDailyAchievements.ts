import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";
import { useAuth } from "@/contexts/AuthContext";

// --- Types ---
export interface DailyAchievement {
  id: string;
  sector_id: string;
  achieved_quantity: number;
  date: string; // ISO date string "YYYY-MM-DD"
}

export interface DailyAchievementFormValues {
  sector_id: string;
  achieved_quantity: number;
  date: Date;
}

// --- API Functions ---
const fetchDailyAchievements = async (version: string, unitId: string): Promise<DailyAchievement[]> => {
  let query = supabase.from("daily_achievements").select("*");
  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }
  if (unitId && unitId !== 'all') {
    query = query.eq("unit_id", unitId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

const upsertDailyAchievement = async (values: DailyAchievementFormValues, version: string, unitId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const dateString = values.date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from("daily_achievements")
    .upsert(
      {
        sector_id: values.sector_id,
        date: dateString,
        achieved_quantity: values.achieved_quantity,
        user_id: user?.id,
        period_version: version,
        unit_id: unitId === 'all' ? null : unitId,
      },
      { onConflict: 'sector_id,date' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};


// --- Hooks ---
export const useDailyAchievements = () => {
  const { activeVersion, activeUnitId } = useVersion();
  return useQuery<DailyAchievement[], Error>({
    queryKey: ["daily_achievements", activeVersion, activeUnitId],
    queryFn: () => fetchDailyAchievements(activeVersion, activeUnitId),
  });
};

export const useUpsertDailyAchievement = () => {
  const queryClient = useQueryClient();
  const { activeVersion, activeUnitId } = useVersion();
  const { profile } = useAuth();
  
  return useMutation<any, Error, DailyAchievementFormValues>({
    mutationFn: (data: DailyAchievementFormValues) => {
      const effectiveUnitId = (profile?.role === 'diretor_unidade' && profile?.unit_id)
        ? profile.unit_id
        : activeUnitId;
        
      return upsertDailyAchievement(data, activeVersion, effectiveUnitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_achievements"] });
      toast.success("Lançamento diário salvo com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar lançamento: ${error.message}`);
    },
  });
};
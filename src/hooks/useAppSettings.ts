import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppSetting {
  key: string;
  value: string;
}

const fetchAppSettings = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from("app_settings").select("*");
  if (error) {
    // Se a tabela não existir ainda, retornamos um objeto vazio
    if (error.code === "PGRST116" || error.message.includes("does not exist")) {
      return {};
    }
    throw new Error(error.message);
  }
  
  return data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
};

const updateAppSetting = async ({ key, value }: AppSetting) => {
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ key, value })
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
};

export const useAppSettings = () => {
  return useQuery<Record<string, string>, Error>({
    queryKey: ["app_settings"],
    queryFn: fetchAppSettings,
  });
};

export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAppSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (error) => toast.error(`Erro ao atualizar configuração: ${error.message}`),
  });
};

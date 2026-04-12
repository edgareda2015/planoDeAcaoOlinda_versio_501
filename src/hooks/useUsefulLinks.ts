import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LinkFormValues } from "@/schemas/LinkSchema";
import { toast } from "sonner";

// --- Tipos ---
export interface UsefulLink {
  id: string;
  user_id: string | null;
  title: string;
  url: string;
  created_at: string;
}

// --- Funções de API ---
const fetchUsefulLinks = async (): Promise<UsefulLink[]> => {
  const { data, error } = await supabase.from("useful_links").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const insertUsefulLink = async (linkData: LinkFormValues) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("useful_links").insert({ ...linkData, user_id: user?.id }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateUsefulLink = async (linkData: LinkFormValues & { id: string }) => {
  const { id, ...updateData } = linkData;
  const { data, error } = await supabase.from("useful_links").update(updateData).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteUsefulLink = async (linkId: string) => {
  const { error } = await supabase.from("useful_links").delete().eq("id", linkId);
  if (error) throw new Error(error.message);
  return linkId;
};

// --- Hooks ---
export const useUsefulLinks = () => {
  return useQuery<UsefulLink[], Error>({ queryKey: ["useful_links"], queryFn: fetchUsefulLinks });
};

export const useAddUsefulLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insertUsefulLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useful_links"] });
      toast.success("Link adicionado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao adicionar link: ${error.message}`),
  });
};

export const useUpdateUsefulLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUsefulLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useful_links"] });
      toast.success("Link atualizado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao atualizar link: ${error.message}`),
  });
};

export const useDeleteUsefulLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUsefulLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useful_links"] });
      toast.success("Link excluído com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao excluir link: ${error.message}`),
  });
};
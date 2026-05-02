import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Regional {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  regional_id: string;
  name: string;
  regionals?: { name: string };
}

// -- Regionais --
const fetchRegionals = async (): Promise<Regional[]> => {
  const { data, error } = await supabase.from("regionals").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const insertRegional = async (name: string) => {
  const { data, error } = await supabase.from("regionals").insert({ name }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteRegional = async (id: string) => {
  const { error } = await supabase.from("regionals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return id;
};

export const useRegionals = () => useQuery({ queryKey: ["regionals"], queryFn: fetchRegionals });

export const useAddRegional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: insertRegional,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regionals"] });
      toast.success("Regional cadastrada com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao cadastrar regional: ${err.message}`)
  });
};

export const useDeleteRegional = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRegional,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regionals"] });
      toast.success("Regional excluída com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao excluir regional: ${err.message}`)
  });
};

// -- Unidades --
const fetchUnits = async (): Promise<Unit[]> => {
  const { data, error } = await supabase.from("units").select("*, regionals(name)").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const insertUnit = async (unit: { name: string, regional_id: string }) => {
  const { data, error } = await supabase.from("units").insert(unit).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteUnit = async (id: string) => {
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return id;
};

export const useUnits = () => useQuery({ queryKey: ["units"], queryFn: fetchUnits });

export const useAddUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: insertUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unidade cadastrada com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao cadastrar unidade: ${err.message}`)
  });
};

export const useDeleteUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unidade excluída com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao excluir unidade: ${err.message}`)
  });
};

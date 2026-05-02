import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";

// --- Tipos ---
interface SectorFormValues {
  name: string;
  description?: string;
  type: 'matricula' | 'coordenacao' | 'administrativo';
}

interface Sector extends SectorFormValues {
  id: string;
}

// Form values for creating a new responsible person
interface ResponsibleFormValues {
  firstName: string;
  lastName: string;
}

// Payload for updating an existing responsible person
interface UpdateResponsiblePayload extends ResponsibleFormValues {
  id: string;
}

// --- Funções de API (Setores) ---
const insertSector = async (sectorData: SectorFormValues, unitId: string) => {
  const { data, error } = await supabase.from("sectors").insert({ 
    name: sectorData.name, 
    description: sectorData.description || null,
    type: sectorData.type,
    unit_id: unitId === 'all' ? null : unitId
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateSector = async (sectorData: Sector) => {
  const { data, error } = await supabase.from("sectors").update({ 
    name: sectorData.name, 
    description: sectorData.description,
    type: sectorData.type,
  }).eq("id", sectorData.id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteSector = async (sectorId: string) => {
  const { error } = await supabase.from("sectors").delete().eq("id", sectorId);
  if (error) throw new Error(error.message);
  return sectorId;
};

// --- Funções de API (Responsáveis) ---
const insertResponsible = async (responsibleData: ResponsibleFormValues) => {
  const { data, error } = await supabase.from("responsibles").insert({ first_name: responsibleData.firstName, last_name: responsibleData.lastName }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateResponsible = async (responsibleData: UpdateResponsiblePayload) => {
  const { data, error } = await supabase.from("responsibles").update({ first_name: responsibleData.firstName, last_name: responsibleData.lastName }).eq("id", responsibleData.id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteResponsible = async (responsibleId: string) => {
  const { error } = await supabase.from("responsibles").delete().eq("id", responsibleId);
  if (error) throw new Error(error.message);
  return responsibleId;
};

// --- Hooks (Setores) ---
export const useAddSector = () => {
  const queryClient = useQueryClient();
  const { activeUnitId } = useVersion();
  return useMutation<any, Error, SectorFormValues>({
    mutationFn: (data: SectorFormValues) => insertSector(data, activeUnitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor cadastrado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao cadastrar setor: ${error.message}`),
  });
};

export const useUpdateSector = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Sector>({
    mutationFn: updateSector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor atualizado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao atualizar setor: ${error.message}`),
  });
};

export const useDeleteSector = () => {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: deleteSector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor excluído com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao excluir setor: ${error.message}`),
  });
};

// --- Hooks (Responsáveis) ---
export const useAddResponsible = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, ResponsibleFormValues>({
    mutationFn: insertResponsible,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsibles"] });
      toast.success("Responsável cadastrado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao cadastrar responsável: ${error.message}`),
  });
};

export const useUpdateResponsible = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, UpdateResponsiblePayload>({
    mutationFn: updateResponsible,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsibles"] });
      toast.success("Responsável atualizado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao atualizar responsável: ${error.message}`),
  });
};

export const useDeleteResponsible = () => {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: deleteResponsible,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsibles"] });
      toast.success("Responsável excluído com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao excluir responsável: ${error.message}`),
  });
};
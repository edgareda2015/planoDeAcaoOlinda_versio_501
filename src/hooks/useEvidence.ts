import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVersion } from "@/contexts/VersionContext";
import { useAuth } from "@/contexts/AuthContext";
import { EvidenceAlbumFormValues } from "@/schemas/EvidenceSchema";

// Interfaces
export interface EvidenceAlbum {
  id: string;
  title: string;
  description: string | null;
  action_id: string | null;
  responsible_name: string | null;
  date: string | null;
  participants: string | null;
  leads_captured: number;
  action_result: string | null;
  observations: string | null;
  cover_photo_url: string | null;
  regional_id: string | null;
  unit_id: string | null;
  period_version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  units?: { name: string } | null;
  regionals?: { name: string } | null;
  actions?: { description: string } | null;
  evidence_photos?: { count: number }[];
}

export interface EvidencePhoto {
  id: string;
  album_id: string;
  photo_url: string;
  storage_path: string;
  thumbnail_url: string;
  thumbnail_storage_path: string;
  description: string | null;
  posted_by: string | null;
  posted_by_name: string | null;
  created_at: string;
  updated_at: string | null;
}

// Fetching
const fetchAlbums = async (version: string, unitId: string, profile: any): Promise<EvidenceAlbum[]> => {
  let query = supabase
    .from("evidence_albums")
    .select(`
      *,
      units(name),
      regionals(name),
      actions(description),
      evidence_photos(count)
    `);

  if (version !== 'all' && version !== 'todos') {
    query = query.eq("period_version", version);
  }

  if (profile?.role === 'diretor_unidade' && profile?.unit_id) {
    query = query.eq("unit_id", profile.unit_id);
  } else if (profile?.role === 'diretor_regional' && profile?.regional_id) {
    query = query.eq("regional_id", profile.regional_id);
    if (unitId !== 'all') {
      query = query.eq("unit_id", unitId);
    }
  } else if (unitId !== 'all') {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as any[];
};

const fetchAlbumDetails = async (id: string): Promise<EvidenceAlbum & { photos: EvidencePhoto[] }> => {
  const { data: album, error: albumError } = await supabase
    .from("evidence_albums")
    .select(`
      *,
      units(name),
      regionals(name),
      actions(description)
    `)
    .eq("id", id)
    .single();

  if (albumError) throw new Error(albumError.message);

  const { data: photos, error: photosError } = await supabase
    .from("evidence_photos")
    .select("*")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  if (photosError) throw new Error(photosError.message);

  return {
    ...album,
    photos: photos as EvidencePhoto[]
  } as any;
};

// Hooks
export const useAlbums = () => {
  const { activeVersion, activeUnitId } = useVersion();
  const { profile } = useAuth();
  return useQuery<EvidenceAlbum[], Error>({
    queryKey: ["evidence_albums", activeVersion, activeUnitId],
    queryFn: () => fetchAlbums(activeVersion, activeUnitId, profile)
  });
};

export const useAlbumDetails = (id: string) => {
  return useQuery<EvidenceAlbum & { photos: EvidencePhoto[] }, Error>({
    queryKey: ["evidence_album", id],
    queryFn: () => fetchAlbumDetails(id),
    enabled: !!id
  });
};

export const useAddAlbum = () => {
  const queryClient = useQueryClient();
  const { activeVersion, activeUnitId } = useVersion();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (payload: { formValues: EvidenceAlbumFormValues; photos: { file: File; optimized: Blob; thumb: Blob }[]; coverPhotoIndex: number; photoDescriptions?: string[] }) => {
      if (!profile || !user) throw new Error("Usuário não autenticado");

      // Resolve regional_id e unit_id com base no perfil ou unidade ativa
      const effectiveUnitId = (profile.role === 'diretor_unidade' && profile.unit_id)
        ? profile.unit_id
        : (payload.formValues.unit_id || (activeUnitId === 'all' ? null : activeUnitId));
        
      let effectiveRegionalId = payload.formValues.regional_id || profile.regional_id || null;

      // Se unit_id for fornecido mas regional_id não, busca a regional da unidade
      if (effectiveUnitId && !effectiveRegionalId) {
        const { data: unitData } = await supabase
          .from("units")
          .select("regional_id")
          .eq("id", effectiveUnitId)
          .single();
        if (unitData) {
          effectiveRegionalId = unitData.regional_id;
        }
      }

      // 1. Inserir Álbum
      const { data: album, error: albumError } = await supabase
        .from("evidence_albums")
        .insert({
          title: payload.formValues.title,
          description: payload.formValues.description || null,
          action_id: payload.formValues.action_id || null,
          responsible_name: payload.formValues.responsible_name,
          date: payload.formValues.date ? payload.formValues.date.toISOString().split('T')[0] : null,
          participants: payload.formValues.participants || null,
          leads_captured: payload.formValues.leads_captured || 0,
          action_result: payload.formValues.action_result || null,
          observations: payload.formValues.observations || null,
          cover_photo_url: null, // Será atualizado depois do upload das fotos
          regional_id: effectiveRegionalId,
          unit_id: effectiveUnitId,
          period_version: activeVersion,
          created_by: profile.id
        })
        .select()
        .single();

      if (albumError) throw new Error(albumError.message);

      // 2. Upload de fotos e inserção na tabela de fotos
      const uploadedPhotos: { photo_url: string; storage_path: string; thumbnail_url: string; thumbnail_storage_path: string }[] = [];

      for (let i = 0; i < payload.photos.length; i++) {
        const item = payload.photos[i];
        const randomId = Math.random().toString(36).substring(2, 15);
        
        const fileExt = "webp";
        const pathFull = `${album.id}/${randomId}_full.${fileExt}`;
        const pathThumb = `${album.id}/${randomId}_thumb.${fileExt}`;

        // Upload Full
        const { error: uploadFullError } = await supabase.storage
          .from("evidences")
          .upload(pathFull, item.optimized, { contentType: "image/webp" });

        if (uploadFullError) throw new Error(`Falha no upload da foto ${i + 1}: ${uploadFullError.message}`);

        // Upload Thumb
        const { error: uploadThumbError } = await supabase.storage
          .from("evidences")
          .upload(pathThumb, item.thumb, { contentType: "image/webp" });

        if (uploadThumbError) throw new Error(`Falha no upload do thumbnail ${i + 1}: ${uploadThumbError.message}`);

        // Get URLs
        const { data: { publicUrl: fullUrl } } = supabase.storage.from("evidences").getPublicUrl(pathFull);
        const { data: { publicUrl: thumbUrl } } = supabase.storage.from("evidences").getPublicUrl(pathThumb);

        // Salva registro da foto no DB (com descrição individual se fornecida)
        const photoDescription = payload.photoDescriptions?.[i] || null;
        const { error: photoDbError } = await supabase
          .from("evidence_photos")
          .insert({
            album_id: album.id,
            photo_url: fullUrl,
            storage_path: pathFull,
            thumbnail_url: thumbUrl,
            thumbnail_storage_path: pathThumb,
            description: photoDescription,
            posted_by: profile.id,
            posted_by_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
          });

        if (photoDbError) throw new Error(`Erro ao registrar foto no banco: ${photoDbError.message}`);

        uploadedPhotos.push({
          photo_url: fullUrl,
          storage_path: pathFull,
          thumbnail_url: thumbUrl,
          thumbnail_storage_path: pathThumb
        });
      }

      // 3. Atualiza a foto de capa com a foto selecionada pelo usuário
      if (uploadedPhotos.length > 0) {
        const coverIdx = Math.min(payload.coverPhotoIndex, uploadedPhotos.length - 1);
        await supabase
          .from("evidence_albums")
          .update({ cover_photo_url: uploadedPhotos[coverIdx].photo_url })
          .eq("id", album.id);
      }

      // 4. Registrar Log de Auditoria
      await supabase
        .from("evidence_logs")
        .insert({
          album_id: album.id,
          action: "CREATE_ALBUM",
          user_id: profile.id,
          details: {
            title: album.title,
            photos_count: uploadedPhotos.length,
            unit_id: effectiveUnitId,
            period: activeVersion
          }
        });

      return album;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence_albums"] });
      toast.success("Álbum de evidências criado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao criar álbum: ${err.message}`);
    }
  });
};

export const useUpdateAlbum = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: { id: string; formValues: Partial<EvidenceAlbumFormValues> }) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const updateData: any = {};
      if (payload.formValues.title !== undefined) updateData.title = payload.formValues.title;
      if (payload.formValues.description !== undefined) updateData.description = payload.formValues.description;
      if (payload.formValues.responsible_name !== undefined) updateData.responsible_name = payload.formValues.responsible_name;
      if (payload.formValues.date !== undefined) updateData.date = payload.formValues.date ? payload.formValues.date.toISOString().split('T')[0] : null;
      if (payload.formValues.participants !== undefined) updateData.participants = payload.formValues.participants;
      if (payload.formValues.leads_captured !== undefined) updateData.leads_captured = payload.formValues.leads_captured;
      if (payload.formValues.action_result !== undefined) updateData.action_result = payload.formValues.action_result;
      if (payload.formValues.observations !== undefined) updateData.observations = payload.formValues.observations;
      if (payload.formValues.action_id !== undefined) updateData.action_id = payload.formValues.action_id;
      if (payload.formValues.cover_photo_url !== undefined) updateData.cover_photo_url = payload.formValues.cover_photo_url;

      updateData.updated_at = new Date().toISOString();

      const { data: album, error } = await supabase
        .from("evidence_albums")
        .update(updateData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Registrar Log de Auditoria
      await supabase
        .from("evidence_logs")
        .insert({
          album_id: payload.id,
          action: "UPDATE_ALBUM",
          user_id: profile.id,
          details: {
            updated_fields: Object.keys(updateData)
          }
        });

      return album;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_albums"] });
      queryClient.invalidateQueries({ queryKey: ["evidence_album", data.id] });
      toast.success("Álbum atualizado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar álbum: ${err.message}`);
    }
  });
};

export const useDeleteAlbum = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (albumId: string) => {
      if (!profile) throw new Error("Usuário não autenticado");

      // 1. Busca todas as fotos do álbum para excluir do storage
      const { data: photos } = await supabase
        .from("evidence_photos")
        .select("storage_path, thumbnail_storage_path")
        .eq("album_id", albumId);

      if (photos && photos.length > 0) {
        const filesToRemove = photos.flatMap(p => [p.storage_path, p.thumbnail_storage_path]);
        
        // Remove arquivos do Storage do Supabase em lote
        await supabase.storage
          .from("evidences")
          .remove(filesToRemove);
      }

      // 2. Exclui o álbum do banco de dados (cascade deletará as fotos em public.evidence_photos)
      const { error } = await supabase
        .from("evidence_albums")
        .delete()
        .eq("id", albumId);

      if (error) throw new Error(error.message);

      // 3. Registrar Log de Auditoria
      await supabase
        .from("evidence_logs")
        .insert({
          album_id: albumId,
          action: "DELETE_ALBUM",
          user_id: profile.id,
          details: { album_id: albumId }
        });

      return albumId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence_albums"] });
      toast.success("Álbum excluído com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao excluir álbum: ${err.message}`);
    }
  });
};

export const useAddPhotosToAlbum = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: { albumId: string; photos: { file: File; optimized: Blob; thumb: Blob }[]; photoDescriptions?: string[] }) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const uploadedPhotos: { photo_url: string; storage_path: string }[] = [];

      for (let i = 0; i < payload.photos.length; i++) {
        const item = payload.photos[i];
        const randomId = Math.random().toString(36).substring(2, 15);
        
        const fileExt = "webp";
        const pathFull = `${payload.albumId}/${randomId}_full.${fileExt}`;
        const pathThumb = `${payload.albumId}/${randomId}_thumb.${fileExt}`;

        // Upload Full
        const { error: uploadFullError } = await supabase.storage
          .from("evidences")
          .upload(pathFull, item.optimized, { contentType: "image/webp" });

        if (uploadFullError) throw new Error(`Falha no upload da foto ${i + 1}: ${uploadFullError.message}`);

        // Upload Thumb
        const { error: uploadThumbError } = await supabase.storage
          .from("evidences")
          .upload(pathThumb, item.thumb, { contentType: "image/webp" });

        if (uploadThumbError) throw new Error(`Falha no upload do thumbnail ${i + 1}: ${uploadThumbError.message}`);

        // Get URLs
        const { data: { publicUrl: fullUrl } } = supabase.storage.from("evidences").getPublicUrl(pathFull);
        const { data: { publicUrl: thumbUrl } } = supabase.storage.from("evidences").getPublicUrl(pathThumb);

        // Salva no DB
        const photoDescription = payload.photoDescriptions?.[i] || null;
        const { error: photoDbError } = await supabase
          .from("evidence_photos")
          .insert({
            album_id: payload.albumId,
            photo_url: fullUrl,
            storage_path: pathFull,
            thumbnail_url: thumbUrl,
            thumbnail_storage_path: pathThumb,
            description: photoDescription,
            posted_by: profile.id,
            posted_by_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
          });

        if (photoDbError) throw new Error(`Erro ao registrar foto: ${photoDbError.message}`);

        uploadedPhotos.push({
          photo_url: fullUrl,
          storage_path: pathFull
        });
      }

      // Se o álbum não tinha foto de capa, atualiza
      const { data: album } = await supabase
        .from("evidence_albums")
        .select("cover_photo_url")
        .eq("id", payload.albumId)
        .single();

      if (album && !album.cover_photo_url && uploadedPhotos.length > 0) {
        await supabase
          .from("evidence_albums")
          .update({ cover_photo_url: uploadedPhotos[0].photo_url })
          .eq("id", payload.albumId);
      }

      // Registrar Log de Auditoria
      await supabase
        .from("evidence_logs")
        .insert({
          album_id: payload.albumId,
          action: "ADD_PHOTOS",
          user_id: profile.id,
          details: { photos_added_count: uploadedPhotos.length }
        });

      return payload.albumId;
    },
    onSuccess: (albumId) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_albums"] });
      queryClient.invalidateQueries({ queryKey: ["evidence_album", albumId] });
      toast.success("Fotos adicionadas com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar fotos: ${err.message}`);
    }
  });
};

export const useDeletePhoto = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: { photoId: string; albumId: string; storagePath: string; thumbnailStoragePath: string }) => {
      if (!profile) throw new Error("Usuário não autenticado");

      // 1. Remove arquivos do Storage do Supabase
      await supabase.storage
        .from("evidences")
        .remove([payload.storagePath, payload.thumbnailStoragePath]);

      // 2. Remove o registro do banco
      const { error } = await supabase
        .from("evidence_photos")
        .delete()
        .eq("id", payload.photoId);

      if (error) throw new Error(error.message);

      // 3. Verifica se a foto excluída era a capa e ajusta se necessário
      const { data: album } = await supabase
        .from("evidence_albums")
        .select("cover_photo_url")
        .eq("id", payload.albumId)
        .single();

      const { data: remainingPhotos } = await supabase
        .from("evidence_photos")
        .select("photo_url")
        .eq("album_id", payload.albumId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (remainingPhotos) {
        const nextCoverUrl = remainingPhotos.length > 0 ? remainingPhotos[0].photo_url : null;
        if (album && (!nextCoverUrl || album.cover_photo_url !== nextCoverUrl)) {
          await supabase
            .from("evidence_albums")
            .update({ cover_photo_url: nextCoverUrl })
            .eq("id", payload.albumId);
        }
      }

      // Registrar Log de Auditoria
      await supabase
        .from("evidence_logs")
        .insert({
          album_id: payload.albumId,
          action: "DELETE_PHOTO",
          user_id: profile.id,
          details: { photo_id: payload.photoId }
        });

      return payload.albumId;
    },
    onSuccess: (albumId) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_albums"] });
      queryClient.invalidateQueries({ queryKey: ["evidence_album", albumId] });
      toast.success("Foto removida com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover foto: ${err.message}`);
    }
  });
};

export const useUpdatePhotoDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { photoId: string; albumId: string; description: string }) => {
      const { error } = await supabase
        .from("evidence_photos")
        .update({
          description: payload.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.photoId);

      if (error) throw new Error(error.message);
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evidence_album", data.albumId] });
      toast.success("Descrição atualizada!");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar descrição: ${err.message}`);
    }
  });
};

export const useEvidenceStats = () => {
  const { activeVersion, activeUnitId } = useVersion();
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["evidence_stats", activeVersion, activeUnitId],
    queryFn: async () => {
      let query = supabase
        .from("evidence_albums")
        .select(`
          id,
          leads_captured,
          participants,
          unit_id,
          regional_id,
          action_id,
          evidence_photos(count)
        `);

      if (activeVersion !== 'all' && activeVersion !== 'todos') {
        query = query.eq("period_version", activeVersion);
      }

      if (profile?.role === 'diretor_unidade' && profile?.unit_id) {
        query = query.eq("unit_id", profile.unit_id);
      } else if (profile?.role === 'diretor_regional' && profile?.regional_id) {
        query = query.eq("regional_id", profile.regional_id);
        if (activeUnitId !== 'all') {
          query = query.eq("unit_id", activeUnitId);
        }
      } else if (activeUnitId !== 'all') {
        query = query.eq("unit_id", activeUnitId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Processamento das estatísticas no cliente
      const albumsCount = data.length;
      let totalLeads = 0;
      let totalParticipants = 0;
      let totalPhotos = 0;
      let linkedActionsCount = 0;

      const evidenceByUnit: { [key: string]: number } = {};
      const evidenceByRegional: { [key: string]: number } = {};

      data.forEach((album: any) => {
        totalLeads += album.leads_captured || 0;
        
        // Trata participantes como lista de nomes ou número
        if (album.participants) {
          const names = album.participants.split(",").map((n: string) => n.trim()).filter(Boolean);
          totalParticipants += names.length;
        }

        const photoCount = album.evidence_photos?.[0]?.count || 0;
        totalPhotos += photoCount;

        if (album.action_id) {
          linkedActionsCount++;
        }

        // Agrupados
        if (album.unit_id) {
          evidenceByUnit[album.unit_id] = (evidenceByUnit[album.unit_id] || 0) + 1;
        }
        if (album.regional_id) {
          evidenceByRegional[album.regional_id] = (evidenceByRegional[album.regional_id] || 0) + 1;
        }
      });

      return {
        albumsCount,
        totalLeads,
        totalParticipants,
        totalPhotos,
        linkedActionsCount,
        evidenceByUnit,
        evidenceByRegional
      };
    }
  });
};

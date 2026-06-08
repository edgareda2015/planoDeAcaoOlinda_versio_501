-- 1. Criação do Bucket de Evidências no Storage do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o Bucket (exclui primeiro se já existirem)
DROP POLICY IF EXISTS "Leitura pública de fotos de evidência" ON storage.objects;
DROP POLICY IF EXISTS "Upload por usuário autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão por usuário autenticado" ON storage.objects;

CREATE POLICY "Leitura pública de fotos de evidência" ON storage.objects FOR SELECT TO public USING (bucket_id = 'evidences');
CREATE POLICY "Upload por usuário autenticado" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidences');
CREATE POLICY "Exclusão por usuário autenticado" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidences');

-- 2. Tabela de Álbuns
CREATE TABLE IF NOT EXISTS public.evidence_albums (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    action_id uuid REFERENCES public.actions(id) ON DELETE SET NULL,
    responsible_name text,
    date date,
    participants text,
    leads_captured integer DEFAULT 0,
    action_result text,
    observations text,
    cover_photo_url text,
    regional_id uuid REFERENCES public.regionals(id) ON DELETE SET NULL,
    unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
    period_version varchar(10) NOT NULL DEFAULT '2026.1',
    created_by text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Fotos do Álbum
CREATE TABLE IF NOT EXISTS public.evidence_photos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id uuid NOT NULL REFERENCES public.evidence_albums(id) ON DELETE CASCADE,
    photo_url text NOT NULL,
    storage_path text NOT NULL,
    thumbnail_url text NOT NULL,
    thumbnail_storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Logs de Auditoria do Módulo
CREATE TABLE IF NOT EXISTS public.evidence_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id uuid,
    action text NOT NULL, -- 'CREATE_ALBUM', 'UPDATE_ALBUM', 'DELETE_ALBUM', 'ADD_PHOTOS', 'DELETE_PHOTO'
    user_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habilitar RLS
ALTER TABLE public.evidence_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para evidence_albums (exclui primeiro para evitar erros)
DROP POLICY IF EXISTS "Visualização de álbuns baseada em Regional/Unidade" ON public.evidence_albums;
DROP POLICY IF EXISTS "Inserção de álbuns baseada em Regional/Unidade" ON public.evidence_albums;
DROP POLICY IF EXISTS "Edição de álbuns baseada em Regional/Unidade" ON public.evidence_albums;
DROP POLICY IF EXISTS "Exclusão de álbuns baseada em Regional/Unidade" ON public.evidence_albums;

CREATE POLICY "Visualização de álbuns baseada em Regional/Unidade" ON public.evidence_albums
FOR SELECT TO authenticated
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND regional_id = get_user_regional_id()) OR
  (get_user_role() = 'diretor_unidade' AND unit_id = get_user_unit_id())
);

CREATE POLICY "Inserção de álbuns baseada em Regional/Unidade" ON public.evidence_albums
FOR INSERT TO authenticated
WITH CHECK (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND regional_id = get_user_regional_id()) OR
  (get_user_role() = 'diretor_unidade' AND unit_id = get_user_unit_id())
);

CREATE POLICY "Edição de álbuns baseada em Regional/Unidade" ON public.evidence_albums
FOR UPDATE TO authenticated
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND regional_id = get_user_regional_id()) OR
  (get_user_role() = 'diretor_unidade' AND unit_id = get_user_unit_id())
);

CREATE POLICY "Exclusão de álbuns baseada em Regional/Unidade" ON public.evidence_albums
FOR DELETE TO authenticated
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND regional_id = get_user_regional_id()) OR
  (get_user_role() = 'diretor_unidade' AND unit_id = get_user_unit_id())
);

-- Políticas para evidence_photos (herdam acesso dos álbuns via JOIN)
DROP POLICY IF EXISTS "Visualização de fotos de álbuns acessíveis" ON public.evidence_photos;
DROP POLICY IF EXISTS "Inserção de fotos em álbuns acessíveis" ON public.evidence_photos;
DROP POLICY IF EXISTS "Exclusão de fotos de álbuns acessíveis" ON public.evidence_photos;

CREATE POLICY "Visualização de fotos de álbuns acessíveis" ON public.evidence_photos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evidence_albums a
    WHERE a.id = album_id
  )
);

CREATE POLICY "Inserção de fotos em álbuns acessíveis" ON public.evidence_photos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.evidence_albums a
    WHERE a.id = album_id
  )
);

CREATE POLICY "Exclusão de fotos de álbuns acessíveis" ON public.evidence_photos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evidence_albums a
    WHERE a.id = album_id
  )
);

-- Políticas para logs (apenas administradores e próprios autores visualizam)
DROP POLICY IF EXISTS "Leitura de logs por admin" ON public.evidence_logs;
DROP POLICY IF EXISTS "Inserção automática de logs por usuários autenticados" ON public.evidence_logs;

CREATE POLICY "Leitura de logs por admin" ON public.evidence_logs
FOR SELECT TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "Inserção automática de logs por usuários autenticados" ON public.evidence_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Fix: Desabilitar RLS nas tabelas de Galeria de Evidências
-- O sistema usa autenticação via Clerk com anon key do Supabase (sem JWT Template configurado).
-- auth.uid() retorna null neste contexto, causando falha nas políticas RLS.
-- O controle de acesso é feito no lado cliente (useEvidence.ts) por perfil/role.
-- Padrão idêntico ao restante das tabelas do sistema (actions, profiles, etc).

ALTER TABLE public.evidence_albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_logs   DISABLE ROW LEVEL SECURITY;

-- Remove todas as políticas criadas anteriormente para evitar conflito futuro
DROP POLICY IF EXISTS "Visualização de álbuns baseada em Regional/Unidade" ON public.evidence_albums;
DROP POLICY IF EXISTS "Inserção de álbuns baseada em Regional/Unidade"     ON public.evidence_albums;
DROP POLICY IF EXISTS "Edição de álbuns baseada em Regional/Unidade"       ON public.evidence_albums;
DROP POLICY IF EXISTS "Exclusão de álbuns baseada em Regional/Unidade"     ON public.evidence_albums;

DROP POLICY IF EXISTS "Visualização de fotos de álbuns acessíveis" ON public.evidence_photos;
DROP POLICY IF EXISTS "Inserção de fotos em álbuns acessíveis"     ON public.evidence_photos;
DROP POLICY IF EXISTS "Exclusão de fotos de álbuns acessíveis"     ON public.evidence_photos;

DROP POLICY IF EXISTS "Leitura de logs por admin"                              ON public.evidence_logs;
DROP POLICY IF EXISTS "Inserção automática de logs por usuários autenticados"  ON public.evidence_logs;

-- Storage: liberar para anon também (bucket "evidences")
DROP POLICY IF EXISTS "Leitura pública de fotos de evidência" ON storage.objects;
DROP POLICY IF EXISTS "Upload por usuário autenticado"        ON storage.objects;
DROP POLICY IF EXISTS "Exclusão por usuário autenticado"      ON storage.objects;

CREATE POLICY "Leitura pública de fotos de evidência" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'evidences');

CREATE POLICY "Upload anon de fotos de evidência" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'evidences');

CREATE POLICY "Exclusão anon de fotos de evidência" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'evidences');

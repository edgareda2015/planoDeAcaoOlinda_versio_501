-- Adiciona campos de descrição individual por foto em evidence_photos
-- Permite que cada foto tenha sua própria legenda/descrição, usuário responsável e nome.
-- Os campos são opcionais (nullable) para retrocompatibilidade total.

ALTER TABLE public.evidence_photos
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS posted_by        text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_by_name   text,
  ADD COLUMN IF NOT EXISTS updated_at       timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Garante permissões de CRUD para a role anon (foto uploads)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_photos TO anon, authenticated;

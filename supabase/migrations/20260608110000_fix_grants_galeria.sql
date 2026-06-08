-- Fix: Conceder permissões explícitas à role 'anon' e 'authenticated' nas tabelas da Galeria de Evidências
-- Mesmo com RLS desabilitado, o Supabase exige GRANT explícito para que a anon key funcione.
-- Isso resolve o erro 401 Unauthorized ao consultar evidence_albums.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_albums TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_photos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_logs TO anon, authenticated;

-- Garantir acesso às sequences (IDs automáticos)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

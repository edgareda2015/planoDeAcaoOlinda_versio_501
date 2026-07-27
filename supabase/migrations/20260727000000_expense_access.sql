-- Tabela de controle de acesso ao Cartão de Despesas
CREATE TABLE IF NOT EXISTS public.expense_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  granted_by TEXT NOT NULL DEFAULT 'edgar.tavares@mauriciodenassau.edu.br',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Desabilitar RLS
ALTER TABLE public.expense_access DISABLE ROW LEVEL SECURITY;

-- Permissões totais de acesso
GRANT ALL ON public.expense_access TO anon;
GRANT ALL ON public.expense_access TO authenticated;
GRANT ALL ON public.expense_access TO service_role;

-- Política RLS aberta (caso o Supabase ative RLS automaticamente)
DROP POLICY IF EXISTS "Allow public all" ON public.expense_access;
CREATE POLICY "Allow public all" ON public.expense_access
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Seed admin master
INSERT INTO public.expense_access (email, granted_by)
VALUES ('edgar.tavares@mauriciodenassau.edu.br', 'sistema')
ON CONFLICT (email) DO NOTHING;

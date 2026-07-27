-- Tabela de controle de acesso ao Cartão de Despesas
-- Apenas e-mails cadastrados aqui podem visualizar a página de despesas.
-- O gerenciamento é feito exclusivamente por edgar.tavares@mauriciodenassau.edu.br

CREATE TABLE IF NOT EXISTS public.expense_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  granted_by TEXT NOT NULL DEFAULT 'edgar.tavares@mauriciodenassau.edu.br',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Desabilitar RLS (mesmo padrão usado nas demais tabelas do projeto)
ALTER TABLE public.expense_access DISABLE ROW LEVEL SECURITY;

-- Grants para acesso via anon key
GRANT SELECT, INSERT, DELETE ON public.expense_access TO anon;
GRANT SELECT, INSERT, DELETE ON public.expense_access TO authenticated;

-- Seed: Edgar sempre tem acesso (admin master)
INSERT INTO public.expense_access (email, granted_by)
VALUES ('edgar.tavares@mauriciodenassau.edu.br', 'sistema')
ON CONFLICT (email) DO NOTHING;

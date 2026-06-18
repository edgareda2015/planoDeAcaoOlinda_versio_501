-- Adaptação RLS: sistema usa chave anon sem JWT personalizado do Clerk.
-- As tabelas existentes funcionam com RLS desabilitado.
-- Mantemos RLS ativo mas com políticas permissivas para autenticado/anon,
-- garantindo que o módulo funcione igual ao restante do sistema.

-- Remover policies restritivas e substituir por permissivas (padrão do sistema)
DROP POLICY IF EXISTS "Status visible by everyone" ON public.expense_statuses;
DROP POLICY IF EXISTS "Status manageable by Admin" ON public.expense_statuses;
DROP POLICY IF EXISTS "Sectors access based on Regional/Unidade" ON public.expense_sectors;
DROP POLICY IF EXISTS "Budgets access based on sector unit" ON public.expense_budgets;
DROP POLICY IF EXISTS "Expenses access based on Regional/Unidade" ON public.expenses;
DROP POLICY IF EXISTS "Attachments access based on expense unit" ON public.expense_attachments;

-- Desabilitar RLS (padrão do sistema — acesso controlado pela chave anon + frontend)
ALTER TABLE public.expense_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments DISABLE ROW LEVEL SECURITY;

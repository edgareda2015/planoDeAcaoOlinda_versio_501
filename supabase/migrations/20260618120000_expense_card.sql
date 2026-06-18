-- 1. Tabela de Status de Despesas (Parametrizável)
CREATE TABLE IF NOT EXISTS public.expense_statuses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir status iniciais obrigatórios
INSERT INTO public.expense_statuses (name) VALUES 
('Aberto'), 
('Em Análise'), 
('Aprovado'), 
('Comprado'), 
('Pago'), 
('Cancelado')
ON CONFLICT (name) DO NOTHING;

-- 2. Tabela de Setores de Despesa
CREATE TABLE IF NOT EXISTS public.expense_sectors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (unit_id, name)
);

-- 3. Tabela de Controle de Verba (Permite múltiplos aportes ao longo do tempo)
CREATE TABLE IF NOT EXISTS public.expense_budgets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sector_id uuid REFERENCES public.expense_sectors(id) ON DELETE CASCADE,
    budget_received numeric(12, 2) NOT NULL DEFAULT 0.00,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Despesas (Com suporte a soft delete através da coluna deleted_at)
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sector_id uuid REFERENCES public.expense_sectors(id) ON DELETE CASCADE,
    purchase_date date NOT NULL,
    value numeric(12, 2) NOT NULL DEFAULT 0.00,
    description text NOT NULL,
    ticket_number text NOT NULL,
    ticket_date date NOT NULL,
    status text NOT NULL REFERENCES public.expense_statuses(name) ON UPDATE CASCADE,
    observation text,
    created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
    unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    period_version varchar(10) NOT NULL DEFAULT '2026.1',
    deleted_at timestamp with time zone DEFAULT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Anexos das Despesas
CREATE TABLE IF NOT EXISTS public.expense_attachments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Habilitar RLS em todas as novas tabelas
ALTER TABLE public.expense_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Acesso para Status de Despesas (Qualquer usuário logado pode ler, apenas Admin altera)
DROP POLICY IF EXISTS "Status visible by everyone" ON public.expense_statuses;
CREATE POLICY "Status visible by everyone" ON public.expense_statuses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Status manageable by Admin" ON public.expense_statuses;
CREATE POLICY "Status manageable by Admin" ON public.expense_statuses FOR ALL TO authenticated 
USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- 8. Políticas de Acesso para Setores de Despesa
DROP POLICY IF EXISTS "Sectors access based on Regional/Unidade" ON public.expense_sectors;
CREATE POLICY "Sectors access based on Regional/Unidade" ON public.expense_sectors
FOR ALL TO authenticated
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND u.regional_id = get_user_regional_id()))) OR
  (get_user_role() = 'diretor_unidade' AND (unit_id = get_user_unit_id() OR unit_id IS NULL))
)
WITH CHECK (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND u.regional_id = get_user_regional_id()))) OR
  (get_user_role() = 'diretor_unidade' AND (unit_id = get_user_unit_id() OR unit_id IS NULL))
);

-- 9. Políticas de Acesso para Verbas (Aportes)
DROP POLICY IF EXISTS "Budgets access based on sector unit" ON public.expense_budgets;
CREATE POLICY "Budgets access based on sector unit" ON public.expense_budgets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expense_sectors es
    WHERE es.id = sector_id AND (
      (get_user_role() = 'admin') OR
      (get_user_role() = 'diretor_regional' AND (es.unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = es.unit_id AND u.regional_id = get_user_regional_id()))) OR
      (get_user_role() = 'diretor_unidade' AND (es.unit_id = get_user_unit_id() OR es.unit_id IS NULL))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expense_sectors es
    WHERE es.id = sector_id AND (
      (get_user_role() = 'admin') OR
      (get_user_role() = 'diretor_regional' AND (es.unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = es.unit_id AND u.regional_id = get_user_regional_id()))) OR
      (get_user_role() = 'diretor_unidade' AND (es.unit_id = get_user_unit_id() OR es.unit_id IS NULL))
    )
  )
);

-- 10. Políticas de Acesso para Despesas
DROP POLICY IF EXISTS "Expenses access based on Regional/Unidade" ON public.expenses;
CREATE POLICY "Expenses access based on Regional/Unidade" ON public.expenses
FOR ALL TO authenticated
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND u.regional_id = get_user_regional_id()))) OR
  (get_user_role() = 'diretor_unidade' AND (unit_id = get_user_unit_id() OR unit_id IS NULL))
)
WITH CHECK (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'diretor_regional' AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND u.regional_id = get_user_regional_id()))) OR
  (get_user_role() = 'diretor_unidade' AND (unit_id = get_user_unit_id() OR unit_id IS NULL))
);

-- 11. Políticas de Acesso para Anexos
DROP POLICY IF EXISTS "Attachments access based on expense unit" ON public.expense_attachments;
CREATE POLICY "Attachments access based on expense unit" ON public.expense_attachments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND (
      (get_user_role() = 'admin') OR
      (get_user_role() = 'diretor_regional' AND (e.unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = e.unit_id AND u.regional_id = get_user_regional_id()))) OR
      (get_user_role() = 'diretor_unidade' AND (e.unit_id = get_user_unit_id() OR e.unit_id IS NULL))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND (
      (get_user_role() = 'admin') OR
      (get_user_role() = 'diretor_regional' AND (e.unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = e.unit_id AND u.regional_id = get_user_regional_id()))) OR
      (get_user_role() = 'diretor_unidade' AND (e.unit_id = get_user_unit_id() OR e.unit_id IS NULL))
    )
  )
);

-- 1. Adicionar coluna accumulates_balance à tabela de setores (padrão true para setores gerais)
ALTER TABLE public.expense_sectors ADD COLUMN IF NOT EXISTS accumulates_balance boolean NOT NULL DEFAULT true;

-- 2. Adicionar coluna period_version à tabela de controle de verbas (padrão '2026.1' para dados legados)
ALTER TABLE public.expense_budgets ADD COLUMN IF NOT EXISTS period_version varchar(10) NOT NULL DEFAULT '2026.1';

-- 3. Atualizar setores chamados 'Administração' (case-insensitive) para não acumular saldo por padrão
UPDATE public.expense_sectors 
SET accumulates_balance = false 
WHERE LOWER(TRIM(name)) = 'administração' OR LOWER(TRIM(name)) = 'administracao';

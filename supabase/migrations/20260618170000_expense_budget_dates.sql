-- Adicionar colunas de data de validade (início e fim) à tabela de controle de verbas
ALTER TABLE public.expense_budgets ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.expense_budgets ADD COLUMN IF NOT EXISTS end_date date;

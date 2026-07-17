-- Adiciona o status "Finalizado" ao módulo Cartão de Despesa
-- Inserção idempotente (ON CONFLICT DO NOTHING)

INSERT INTO public.expense_statuses (name, active) VALUES
  ('Finalizado', true)
ON CONFLICT (name) DO NOTHING;

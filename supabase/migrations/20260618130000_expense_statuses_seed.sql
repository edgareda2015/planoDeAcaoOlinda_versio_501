-- Seed: Status padrão do módulo Cartão de Despesa
-- Inserção idempotente (ON CONFLICT DO NOTHING)

INSERT INTO public.expense_statuses (name, active) VALUES
  ('Aberto',     true),
  ('Em Análise', true),
  ('Aprovado',   true),
  ('Comprado',   true),
  ('Pago',       true),
  ('Cancelado',  true)
ON CONFLICT (name) DO NOTHING;

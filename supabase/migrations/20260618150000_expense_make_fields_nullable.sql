-- Tornar colunas de chamado/OS opcionais (permitindo preenchimento posterior)
ALTER TABLE public.expenses ALTER COLUMN ticket_number DROP NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN ticket_date DROP NOT NULL;

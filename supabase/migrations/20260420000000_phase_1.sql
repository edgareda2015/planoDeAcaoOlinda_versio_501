-- Fase 1: Preparação do Banco de Dados

-- 1.1 Criar tabelas regionals e units
CREATE TABLE IF NOT EXISTS public.regionals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.units (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    regional_id uuid NOT NULL REFERENCES public.regionals(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permitir leitura para usuários logados
ALTER TABLE public.regionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Regionals are viewable by everyone" ON public.regionals;
CREATE POLICY "Regionals are viewable by everyone" ON public.regionals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Units are viewable by everyone" ON public.units;
CREATE POLICY "Units are viewable by everyone" ON public.units FOR SELECT TO authenticated USING (true);


-- 1.3 Adaptar a tabela profiles (supondo que já exista)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regional_id uuid REFERENCES public.regionals(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;


-- 1.2 e 1.4 Popular os registros iniciais e vincular no profiles
DO $$
DECLARE
    v_regional_id uuid;
    v_unit_id uuid;
BEGIN
    -- Regional A
    SELECT id INTO v_regional_id FROM public.regionals WHERE name = 'Regional A' LIMIT 1;
    IF v_regional_id IS NULL THEN
        INSERT INTO public.regionals (name) VALUES ('Regional A') RETURNING id INTO v_regional_id;
    END IF;

    -- UNINASSAU Olinda
    SELECT id INTO v_unit_id FROM public.units WHERE name = 'UNINASSAU Olinda' AND regional_id = v_regional_id LIMIT 1;
    IF v_unit_id IS NULL THEN
        INSERT INTO public.units (name, regional_id) VALUES ('UNINASSAU Olinda', v_regional_id) RETURNING id INTO v_unit_id;
    END IF;

    -- Update massivo dos usuários/perfis atuais
    UPDATE public.profiles
    SET 
        regional_id = v_regional_id,
        unit_id = v_unit_id,
        role = COALESCE(role, 'admin'),
        ativo = true
    WHERE regional_id IS NULL OR unit_id IS NULL;
END $$;


-- 1.5 Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE profiles.id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_regional_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regional_id FROM public.profiles WHERE profiles.id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_unit_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM public.profiles WHERE profiles.id = auth.uid() LIMIT 1;
$$;

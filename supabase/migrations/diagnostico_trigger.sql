-- DIAGNÓSTICO: Verificar se os dados de daily_achievements batem com goals
-- Execute este script no SQL Editor do Supabase para ver o problema

-- 1. Ver os últimos lançamentos no Dia a Dia
SELECT 
  da.id,
  da.date,
  da.achieved_quantity,
  da.period_version,
  da.unit_id,
  da.sector_id,
  s.name as sector_name
FROM public.daily_achievements da
LEFT JOIN public.sectors s ON s.id = da.sector_id
ORDER BY da.date DESC
LIMIT 30;

-- 2. Ver as metas cadastradas e seus campos chave
SELECT 
  g.id,
  g.period_start_date,
  g.period_end_date,
  g.target_quantity,
  g.achieved_quantity,
  g.period_version,
  g.unit_id,
  g.sector_id,
  s.name as sector_name
FROM public.goals g
LEFT JOIN public.sectors s ON s.id = g.sector_id
ORDER BY g.period_start_date DESC;

-- 3. Ver se a trigger existe
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_goal_achieved_quantity';

-- 4. Simulação manual do que a trigger faz para cada meta
SELECT
  g.id as goal_id,
  s.name as sector_name,
  g.period_version as goal_version,
  g.unit_id as goal_unit_id,
  g.period_start_date,
  g.period_end_date,
  g.achieved_quantity as atual_no_banco,
  (
    SELECT COALESCE(SUM(da.achieved_quantity), 0)
    FROM public.daily_achievements da
    WHERE da.sector_id      = g.sector_id
      AND da.unit_id        IS NOT DISTINCT FROM g.unit_id
      AND da.period_version = g.period_version
      AND da.date::date    BETWEEN g.period_start_date AND g.period_end_date
  ) as deveria_ser
FROM public.goals g
LEFT JOIN public.sectors s ON s.id = g.sector_id
ORDER BY s.name;

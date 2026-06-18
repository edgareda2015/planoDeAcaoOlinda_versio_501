-- Corrige as 5 metas com period_end_date inválido (mês errado no fim do período)
UPDATE public.goals
SET period_end_date = CASE id::text
  WHEN 'f1e5147d-8919-482b-b63a-63df335bc9b0' THEN '2026-06-29'::date
  WHEN '1d37c5bd-dec1-4971-bb08-5f959872201a' THEN '2026-07-30'::date
  WHEN '41133e73-fba4-487f-a658-0de5409aaaf8' THEN '2026-08-30'::date
  WHEN '64071a4c-c84a-4119-ac97-2ce7d86a9594' THEN '2026-08-29'::date
  WHEN 'f6049fbb-d124-4703-8d5b-d9181fe04145' THEN '2026-10-30'::date
END
WHERE id IN (
  'f1e5147d-8919-482b-b63a-63df335bc9b0',
  '1d37c5bd-dec1-4971-bb08-5f959872201a',
  '41133e73-fba4-487f-a658-0de5409aaaf8',
  '64071a4c-c84a-4119-ac97-2ce7d86a9594',
  'f6049fbb-d124-4703-8d5b-d9181fe04145'
);

-- Após corrigir as datas, recalcula o achieved_quantity de todas as metas afetadas
UPDATE public.goals g
   SET achieved_quantity = (
         SELECT COALESCE(SUM(da.achieved_quantity), 0)
           FROM public.daily_achievements da
          WHERE da.sector_id      = g.sector_id
            AND da.unit_id        IS NOT DISTINCT FROM g.unit_id
            AND da.period_version = g.period_version
            AND da.date::date    BETWEEN g.period_start_date AND g.period_end_date
       )
WHERE id IN (
  'f1e5147d-8919-482b-b63a-63df335bc9b0',
  '1d37c5bd-dec1-4971-bb08-5f959872201a',
  '41133e73-fba4-487f-a658-0de5409aaaf8',
  '64071a4c-c84a-4119-ac97-2ce7d86a9594',
  'f6049fbb-d124-4703-8d5b-d9181fe04145'
);

-- Confirma o resultado
SELECT g.id, s.name as setor, g.period_start_date, g.period_end_date, g.achieved_quantity
FROM public.goals g
LEFT JOIN public.sectors s ON s.id = g.sector_id
WHERE g.id IN (
  'f1e5147d-8919-482b-b63a-63df335bc9b0',
  '1d37c5bd-dec1-4971-bb08-5f959872201a',
  '41133e73-fba4-487f-a658-0de5409aaaf8',
  '64071a4c-c84a-4119-ac97-2ce7d86a9594',
  'f6049fbb-d124-4703-8d5b-d9181fe04145'
);

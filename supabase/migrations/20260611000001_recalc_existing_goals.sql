-- =============================================================================
-- Recalcula o achieved_quantity de TODAS as metas existentes com base nos
-- lançamentos diários já cadastrados em daily_achievements.
-- Executado uma única vez após a criação da trigger para sincronizar os dados.
-- =============================================================================
UPDATE public.goals g
   SET achieved_quantity = (
         SELECT COALESCE(SUM(da.achieved_quantity), 0)
           FROM public.daily_achievements da
          WHERE da.sector_id      = g.sector_id
            AND da.unit_id        IS NOT DISTINCT FROM g.unit_id
            AND da.period_version = g.period_version
            AND da.date::date    BETWEEN g.period_start_date AND g.period_end_date
       );

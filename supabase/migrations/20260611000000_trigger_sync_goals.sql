-- =============================================================================
-- Migration: Trigger de Sincronização Automática Dia a Dia → Metas
-- Descrição: Sempre que um registro é inserido, atualizado ou deletado na
--            tabela daily_achievements, esta trigger recalcula a soma total e
--            atualiza o campo achieved_quantity na tabela goals correspondente,
--            eliminando a necessidade de dupla digitação pelo usuário.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Função que realiza o recálculo e o UPDATE na tabela goals
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_goal_achieved_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sector_id     uuid;
  v_unit_id       uuid;
  v_version       text;
  v_date          date;
  v_total         numeric;
BEGIN
  -- Determina qual linha foi afetada (INSERT/UPDATE usa NEW, DELETE usa OLD)
  IF TG_OP = 'DELETE' THEN
    v_sector_id := OLD.sector_id;
    v_unit_id   := OLD.unit_id;
    v_version   := OLD.period_version;
    v_date      := OLD.date::date;
  ELSE
    v_sector_id := NEW.sector_id;
    v_unit_id   := NEW.unit_id;
    v_version   := NEW.period_version;
    v_date      := NEW.date::date;
  END IF;

  -- Soma todos os lançamentos diários do mesmo setor / unidade / versão
  -- que caiam dentro do período de qualquer meta ativa
  SELECT COALESCE(SUM(da.achieved_quantity), 0)
    INTO v_total
    FROM public.daily_achievements da
   WHERE da.sector_id      = v_sector_id
     AND da.unit_id        IS NOT DISTINCT FROM v_unit_id
     AND da.period_version = v_version;

  -- Atualiza TODAS as metas do mesmo setor / unidade / versão
  -- cujo período engloba ao menos um dia com lançamento
  UPDATE public.goals g
     SET achieved_quantity = (
           SELECT COALESCE(SUM(da2.achieved_quantity), 0)
             FROM public.daily_achievements da2
            WHERE da2.sector_id      = g.sector_id
              AND da2.unit_id        IS NOT DISTINCT FROM g.unit_id
              AND da2.period_version = g.period_version
              AND da2.date::date    BETWEEN g.period_start_date AND g.period_end_date
         )
   WHERE g.sector_id      = v_sector_id
     AND g.unit_id        IS NOT DISTINCT FROM v_unit_id
     AND g.period_version = v_version;

  RETURN NULL; -- Trigger AFTER não precisa retornar a linha
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Remove a trigger caso já exista (idempotente)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_goal_achieved_quantity
  ON public.daily_achievements;

-- ----------------------------------------------------------------------------
-- 3. Cria a trigger para INSERT, UPDATE e DELETE
-- ----------------------------------------------------------------------------
CREATE TRIGGER trigger_update_goal_achieved_quantity
AFTER INSERT OR UPDATE OR DELETE
ON public.daily_achievements
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_goal_achieved_quantity();

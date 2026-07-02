-- RPC: retorna las últimas respuestas del cron y predicciones huérfanas
CREATE OR REPLACE FUNCTION public.admin_get_sync_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_cron    jsonb;
  v_orphans jsonb;
BEGIN
  SELECT jsonb_agg(row ORDER BY row->>'created' DESC)
  INTO v_cron
  FROM (
    SELECT jsonb_build_object(
      'created',     created,
      'status_code', status_code,
      'content',     LEFT(content::text, 400)
    ) AS row
    FROM net._http_response
    ORDER BY created DESC
    LIMIT 15
  ) t;

  SELECT jsonb_agg(jsonb_build_object(
    'match_id',       m.id,
    'home_team',      m.home_team,
    'away_team',      m.away_team,
    'home_score',     m.home_score,
    'away_score',     m.away_score,
    'pen_score',      m.pen_score,
    'phase',          m.phase,
    'winner_team_id', m.winner_team_id,
    'time',           m.time,
    'orphaned_count', sub.cnt
  ))
  INTO v_orphans
  FROM matches m
  JOIN (
    SELECT match_id, COUNT(*) AS cnt
    FROM predictions
    WHERE points_breakdown IS NULL
    GROUP BY match_id
  ) sub ON sub.match_id = m.id
  WHERE m.status = 'finished';

  RETURN jsonb_build_object(
    'cron_responses',   COALESCE(v_cron,    '[]'::jsonb),
    'orphaned_matches', COALESCE(v_orphans, '[]'::jsonb)
  );
END;
$$;

-- RPC: repara predicciones huérfanas usando el mismo RPC atómico
CREATE OR REPLACE FUNCTION public.admin_repair_orphaned_predictions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_match      RECORD;
  v_res        jsonb;
  v_preds_sum  integer := 0;
  v_match_cnt  integer := 0;
BEGIN
  FOR v_match IN
    SELECT DISTINCT m.id, m.home_score, m.away_score,
                    m.winner_team_id, m.pen_score, m.time
    FROM matches m
    JOIN predictions p ON p.match_id = m.id
    WHERE m.status = 'finished'
      AND p.points_breakdown IS NULL
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
  LOOP
    SELECT edge_finish_match_and_calculate(
      v_match.id, v_match.home_score, v_match.away_score,
      v_match.winner_team_id, v_match.pen_score, v_match.time, NOW()
    ) INTO v_res;
    v_preds_sum := v_preds_sum + COALESCE((v_res->>'predsCalculated')::integer, 0);
    v_match_cnt := v_match_cnt + 1;
  END LOOP;

  RETURN jsonb_build_object('matchesFixed', v_match_cnt, 'predsCalculated', v_preds_sum);
END;
$$;

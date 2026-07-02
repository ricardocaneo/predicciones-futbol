CREATE OR REPLACE FUNCTION public.edge_finish_match_and_calculate(
  p_match_id        uuid,
  p_home_score      integer,
  p_away_score      integer,
  p_winner_team_id  uuid,
  p_pen_score       text,
  p_time            text,
  p_last_synced_at  timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phase        text;
  v_pred         RECORD;
  v_exact        integer; v_goal_diff  integer; v_tendency   integer;
  v_consolation  integer; v_adv_bonus  integer; v_live_exact integer;
  v_act_diff     integer; v_pred_diff  integer;
  v_is_exact     boolean; v_is_gd      boolean;
  v_is_tend      boolean; v_is_cons    boolean; v_adv_app    boolean;
  v_base         integer; v_adv        integer; v_total      integer;
  v_category     text;    v_breakdown  jsonb;
  v_count        integer := 0;
  v_user_ids     uuid[]  := '{}';
  v_user_id      uuid;
  v_tot_pts      integer;
BEGIN
  SELECT phase INTO v_phase FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'match not found', 'predsCalculated', 0);
  END IF;

  -- Cierra el partido y calcula puntos en una sola transacción (sin ventana de race condition)
  UPDATE matches SET
    status           = 'finished',
    home_score       = p_home_score,
    away_score       = p_away_score,
    winner_team_id   = p_winner_team_id,
    pen_score        = p_pen_score,
    time             = p_time,
    minute           = NULL,
    last_synced_at   = p_last_synced_at,
    sync_received_at = p_last_synced_at,
    last_changed     = p_last_synced_at
  WHERE id = p_match_id;

  CASE v_phase
    WHEN 'group'         THEN v_exact:=5;  v_goal_diff:=3;  v_tendency:=2; v_consolation:=1; v_adv_bonus:=0; v_live_exact:=2;
    WHEN 'round_of_32'  THEN v_exact:=8;  v_goal_diff:=5;  v_tendency:=3; v_consolation:=2; v_adv_bonus:=2; v_live_exact:=3;
    WHEN 'round_of_16'  THEN v_exact:=8;  v_goal_diff:=5;  v_tendency:=3; v_consolation:=2; v_adv_bonus:=2; v_live_exact:=3;
    WHEN 'quarter_final' THEN v_exact:=12; v_goal_diff:=8;  v_tendency:=5; v_consolation:=3; v_adv_bonus:=4; v_live_exact:=4;
    WHEN 'semi_final'   THEN v_exact:=15; v_goal_diff:=10; v_tendency:=6; v_consolation:=4; v_adv_bonus:=4; v_live_exact:=5;
    WHEN 'third_place'  THEN v_exact:=15; v_goal_diff:=10; v_tendency:=6; v_consolation:=4; v_adv_bonus:=4; v_live_exact:=5;
    WHEN 'final'        THEN v_exact:=18; v_goal_diff:=12; v_tendency:=7; v_consolation:=4; v_adv_bonus:=4; v_live_exact:=6;
    ELSE                     v_exact:=5;  v_goal_diff:=3;  v_tendency:=2; v_consolation:=1; v_adv_bonus:=0; v_live_exact:=2;
  END CASE;

  FOR v_pred IN
    SELECT id, user_id, predicted_home_score, predicted_away_score,
           prediction_mode, advancing_team_id
    FROM predictions
    WHERE match_id = p_match_id AND points_breakdown IS NULL
  LOOP
    IF v_pred.prediction_mode = 'live' THEN
      v_is_exact := v_pred.predicted_home_score = p_home_score AND v_pred.predicted_away_score = p_away_score;
      v_total    := CASE WHEN v_is_exact THEN v_live_exact ELSE 0 END;
      v_category := CASE WHEN v_is_exact THEN 'live' ELSE 'none' END;
      v_base     := v_total; v_adv := 0;
    ELSE
      v_act_diff  := p_home_score - p_away_score;
      v_pred_diff := v_pred.predicted_home_score - v_pred.predicted_away_score;
      v_is_exact  := v_pred.predicted_home_score = p_home_score AND v_pred.predicted_away_score = p_away_score;
      v_is_gd     := NOT v_is_exact AND SIGN(v_act_diff) = SIGN(v_pred_diff) AND v_act_diff = v_pred_diff;
      v_is_tend   := SIGN(v_act_diff) = SIGN(v_pred_diff);
      v_is_cons   := NOT v_is_exact AND NOT v_is_gd AND NOT v_is_tend AND
                     (v_pred.predicted_home_score = p_home_score OR v_pred.predicted_away_score = p_away_score);

      IF    v_is_exact                       THEN v_base := v_exact;       v_category := 'exact';
      ELSIF v_is_gd                          THEN v_base := v_goal_diff;   v_category := 'goalDiff';
      ELSIF v_is_tend                        THEN v_base := v_tendency;    v_category := 'tendency';
      ELSIF v_is_cons AND v_consolation > 0  THEN v_base := v_consolation; v_category := 'consolation';
      ELSE                                        v_base := 0;             v_category := 'none';
      END IF;

      IF v_phase != 'group' AND v_adv_bonus > 0 THEN
        IF v_pred.advancing_team_id IS NOT NULL AND p_winner_team_id IS NOT NULL THEN
          v_adv_app := v_pred.advancing_team_id = p_winner_team_id;
        ELSE
          v_adv_app := v_is_tend;
        END IF;
      ELSE
        v_adv_app := false;
      END IF;

      v_adv   := CASE WHEN v_adv_app THEN v_adv_bonus ELSE 0 END;
      v_total := v_base + v_adv;
    END IF;

    v_breakdown := jsonb_build_object(
      'category', v_category, 'base', v_base,
      'advancement_bonus', v_adv, 'total', v_total
    );

    UPDATE predictions SET points = v_total, points_breakdown = v_breakdown
    WHERE id = v_pred.id
    RETURNING user_id INTO v_user_id;

    IF v_user_id IS NOT NULL AND NOT (v_user_id = ANY(v_user_ids)) THEN
      v_user_ids := array_append(v_user_ids, v_user_id);
    END IF;
    v_count := v_count + 1;
  END LOOP;

  FOREACH v_user_id IN ARRAY v_user_ids LOOP
    SELECT COALESCE(SUM(points), 0) INTO v_tot_pts FROM predictions WHERE user_id = v_user_id;
    UPDATE profiles SET total_points = v_tot_pts WHERE id = v_user_id;
  END LOOP;

  RETURN jsonb_build_object(
    'predsCalculated', v_count,
    'usersUpdated', array_length(v_user_ids, 1)
  );
END;
$$;

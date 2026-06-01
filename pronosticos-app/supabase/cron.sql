-- ============================================================
-- Cron job: sincronizar partidos del Mundial 2026 cada 2 minutos
--
-- REQUISITOS antes de correr este script:
--   1. Activar extensiones en Dashboard → Database → Extensions:
--        - pg_cron
--        - pg_net
--   2. Haber deployado la Edge Function:
--        supabase functions deploy sync-matches --no-verify-jwt
--   3. Haber configurado los secrets en Dashboard → Edge Functions → sync-matches:
--        LIVESCORE_KEY, LIVESCORE_SECRET, CRON_SECRET
-- ============================================================

-- Activar extensiones (por si no están activas vía dashboard)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Eliminar job anterior si existe (para poder volver a correr este script)
select cron.unschedule('sync-wc-matches') where exists (
  select 1 from cron.job where jobname = 'sync-wc-matches'
);

-- Programar la Edge Function cada 2 minutos
-- Reemplazá 'wc2026-sync-2026' con el mismo valor que pusiste en los secrets
select cron.schedule(
  'sync-wc-matches',
  '*/2 * * * *',
  $$
  select net.http_post(
    url     := 'https://wbipydxmgkbrdjcnblvc.supabase.co/functions/v1/sync-matches',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  'wc2026-sync-2026'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verificar que quedó registrado
select jobid, jobname, schedule, active from cron.job where jobname = 'sync-wc-matches';

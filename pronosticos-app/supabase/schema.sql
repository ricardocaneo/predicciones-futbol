-- ============================================================
-- El Juego del Mundial 2026 — Supabase Initial Schema
-- Pegar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES
-- gen_random_uuid() está integrado en PostgreSQL 13+, pero pgcrypto lo provee
-- también en versiones anteriores. Supabase lo incluye por defecto; esta línea
-- es un seguro para cualquier entorno.
-- ──────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN HELPER: is_regular_user()
-- Retorna true solo cuando el JWT de la solicitud tiene role = 'authenticated',
-- es decir, un usuario normal logueado desde el cliente.
-- Retorna false para service_role, anon, o llamadas sin JWT (backend/admin).
-- Se usa en los triggers de protección para distinguir usuario normal vs sistema.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.is_regular_user()
returns boolean language sql stable as $$
  select current_setting('request.jwt.claim.role', true) = 'authenticated'
$$;


-- ──────────────────────────────────────────────────────────────────────────────
-- TABLAS
-- ──────────────────────────────────────────────────────────────────────────────

-- profiles
-- Extiende auth.users con datos públicos del jugador.
-- El INSERT lo realiza el trigger handle_new_user al registrarse.
-- email: copia de auth.users; queda bloqueado por trigger (no editable desde app).
-- total_points: calculado por el sistema al cerrar partidos; no editable por usuarios.
create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  display_name  text        not null,
  email         text        not null,
  avatar_url    text,
  favorite_team text,
  bio           text,
  total_points  int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- matches
-- Partidos del torneo. Escritura solo desde backend/admin con service_role.
-- qualified_team: equipo que avanza en eliminación directa.
--   Si el partido se define por penales, home_score/away_score reflejan el empate
--   de la prórroga y qualified_team indica quién clasificó.
create table public.matches (
  id              uuid        primary key default gen_random_uuid(),
  external_api_id text        unique,
  phase           text        not null
                    check (phase in (
                      'group', 'round_of_32', 'round_of_16',
                      'quarter_final', 'semi_final', 'third_place', 'final'
                    )),
  group_name      text,
  home_team       text        not null,
  away_team       text        not null,
  starts_at       timestamptz not null,
  status          text        not null default 'scheduled'
                    check (status in ('scheduled', 'live', 'finished')),
  home_score      int,
  away_score      int,
  minute          int,
  qualified_team  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- predictions
-- Un pronóstico por usuario por partido (unique constraint).
-- Si el usuario cambia a pronóstico en vivo, se actualiza prediction_mode y scores.
-- points y points_breakdown los actualiza el sistema al finalizar el partido.
-- Campos editables por el usuario: predicted_home_score, predicted_away_score,
--   predicted_qualified_team, prediction_mode (dentro de las ventanas válidas).
create table public.predictions (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references public.profiles(id) on delete cascade,
  match_id                 uuid        not null references public.matches(id) on delete restrict,
  predicted_home_score     int         not null check (predicted_home_score >= 0),
  predicted_away_score     int         not null check (predicted_away_score >= 0),
  predicted_qualified_team text,
  prediction_mode          text        not null default 'pre_match'
                             check (prediction_mode in ('pre_match', 'live')),
  points                   int         not null default 0,
  points_breakdown         jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint predictions_unique_user_match unique (user_id, match_id)
);

-- master_touch_predictions
-- Toque Maestro: campeón, subcampeón y Bota de Oro.
-- Los campos de elección son nullable para permitir guardado parcial.
-- Campos editables por el usuario: champion_team, runner_up_team, golden_boot_player
--   (solo mientras locked_at sea null).
-- locked_at y points son campos de sistema; no editables por usuarios normales.
create table public.master_touch_predictions (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.profiles(id) on delete cascade,
  champion_team       text,
  runner_up_team      text,
  golden_boot_player  text,
  points              int         not null default 0,
  locked_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint master_touch_unique_user unique (user_id)
);


-- ──────────────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────────────────────────────────────

create index idx_predictions_user_id  on public.predictions (user_id);
create index idx_predictions_match_id on public.predictions (match_id);
create index idx_matches_status       on public.matches (status);
create index idx_matches_phase        on public.matches (phase);
create index idx_matches_starts_at    on public.matches (starts_at);
-- Índice parcial: solo filas con external_api_id, para cuando integremos la API externa
create index idx_matches_external_id  on public.matches (external_api_id)
  where external_api_id is not null;


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: set_updated_at
-- Reutilizada por todos los triggers de updated_at.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Nota sobre orden de triggers (PostgreSQL dispara BEFORE triggers en orden
-- alfabético por nombre dentro de la misma tabla y evento):
--
-- profiles:  trg_profiles_updated_at → trg_protect_profile_fields
-- predictions: trg_predictions_updated_at → trg_protect_prediction_fields
--              → trg_validate_prediction_window
-- master_touch: trg_master_touch_lock → trg_master_touch_updated_at
--               → trg_protect_master_touch_fields
--
-- El trigger de updated_at siempre corre antes que los de protección,
-- lo que es correcto: verificamos los campos después de que el sistema
-- haya ajustado updated_at, y no bloqueamos ese ajuste en los checks.

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

create trigger trg_predictions_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

create trigger trg_master_touch_updated_at
  before update on public.master_touch_predictions
  for each row execute function public.set_updated_at();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: auto-crear perfil al registrarse
-- Cuando Supabase Auth crea un usuario nuevo, este trigger inserta
-- automáticamente una fila en profiles tomando display_name del metadata
-- o el prefijo del email como fallback.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: proteger campos inmutables y de sistema en profiles
--
-- Siempre inmutables (nadie puede cambiar, ni el sistema):
--   id, email, created_at
--
-- Solo el sistema puede modificar (service_role/backend):
--   total_points
--   → cuando auth.uid() es null, la llamada viene de service_role y se permite
--
-- El usuario puede modificar: display_name, avatar_url, favorite_team, bio
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.protect_profile_fields()
returns trigger language plpgsql as $$
begin
  if new.id <> old.id then
    raise exception 'profiles.id no puede modificarse';
  end if;

  if new.email <> old.email then
    raise exception 'profiles.email no puede modificarse desde la app';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'profiles.created_at no puede modificarse';
  end if;

  -- total_points solo lo actualiza el sistema al calcular puntos de un partido
  if public.is_regular_user() and new.total_points <> old.total_points then
    raise exception 'profiles.total_points es calculado por el sistema y no puede modificarse directamente';
  end if;

  return new;
end;
$$;

-- 'profiles' < 'protect' alfabéticamente, así que trg_profiles_updated_at
-- corre primero (ajusta new.updated_at) y luego corre este trigger.
-- updated_at no se verifica aquí para no conflictuar con set_updated_at.
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: proteger campos de sistema en predictions
--
-- Siempre inmutables: user_id, match_id, created_at
--
-- Solo el sistema puede modificar (service_role):
--   points, points_breakdown
--
-- El usuario puede modificar (dentro de las ventanas válidas):
--   predicted_home_score, predicted_away_score,
--   predicted_qualified_team, prediction_mode
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.protect_prediction_fields()
returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'predictions.user_id no puede modificarse';
  end if;

  if new.match_id <> old.match_id then
    raise exception 'predictions.match_id no puede modificarse';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'predictions.created_at no puede modificarse';
  end if;

  -- points y points_breakdown solo los actualiza el sistema
  if public.is_regular_user() then
    if new.points <> old.points then
      raise exception 'predictions.points solo puede ser modificado por el sistema';
    end if;

    -- is distinct from maneja correctamente el caso donde ambos son null
    if new.points_breakdown is distinct from old.points_breakdown then
      raise exception 'predictions.points_breakdown solo puede ser modificado por el sistema';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_protect_prediction_fields
  before update on public.predictions
  for each row execute function public.protect_prediction_fields();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: validar ventanas de tiempo para predictions
--
-- pre_match: solo se puede insertar/modificar antes de matches.starts_at
-- live:      solo entre matches.starts_at y matches.starts_at + 35 minutos
--
-- service_role bypasea esta validación (para correcciones de puntos, etc.)
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.validate_prediction_window()
returns trigger language plpgsql as $$
declare
  v_starts_at timestamptz;
begin
  -- solo usuarios normales están sujetos a ventanas de tiempo
  if not public.is_regular_user() then
    return new;
  end if;

  select starts_at into v_starts_at
  from public.matches
  where id = new.match_id;

  if v_starts_at is null then
    raise exception 'Partido no encontrado';
  end if;

  if new.prediction_mode = 'pre_match' then
    if now() >= v_starts_at then
      raise exception 'La ventana de pronóstico pre_match ya cerró para este partido';
    end if;

  elsif new.prediction_mode = 'live' then
    if now() < v_starts_at then
      raise exception 'El partido aún no comenzó; no se puede ingresar pronóstico en vivo';
    end if;
    if now() > v_starts_at + interval '35 minutes' then
      raise exception 'La ventana de pronóstico en vivo ya cerró (límite: minuto 35)';
    end if;
  end if;

  return new;
end;
$$;

-- Aplica tanto en INSERT como en UPDATE
create trigger trg_validate_prediction_window
  before insert or update on public.predictions
  for each row execute function public.validate_prediction_window();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: bloquear Toque Maestro para usuarios normales tras el cierre
--
-- Si locked_at está seteado, el usuario autenticado no puede modificar nada.
-- service_role/backend sí puede corregir (auth.uid() es null en ese contexto).
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.prevent_locked_master_touch_update()
returns trigger language plpgsql as $$
begin
  if not public.is_regular_user() then
    return new;
  end if;

  if old.locked_at is not null then
    raise exception 'El Toque Maestro ya fue bloqueado y no puede modificarse';
  end if;

  return new;
end;
$$;

-- 'lock' < 'updated' < 'protect' — este trigger corre primero.
-- Si el locked_at está seteado, corta antes de que los otros disparen.
create trigger trg_master_touch_lock
  before update on public.master_touch_predictions
  for each row execute function public.prevent_locked_master_touch_update();


-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: proteger campos de sistema en master_touch_predictions
--
-- Siempre inmutables: user_id, created_at
--
-- Solo el sistema puede modificar (service_role):
--   points, locked_at
--
-- El usuario puede modificar (mientras locked_at sea null):
--   champion_team, runner_up_team, golden_boot_player
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.protect_master_touch_fields()
returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'master_touch_predictions.user_id no puede modificarse';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'master_touch_predictions.created_at no puede modificarse';
  end if;

  if public.is_regular_user() then
    if new.points <> old.points then
      raise exception 'master_touch_predictions.points solo puede ser modificado por el sistema';
    end if;

    -- is distinct from maneja correctamente el caso donde ambos son null
    if new.locked_at is distinct from old.locked_at then
      raise exception 'master_touch_predictions.locked_at solo puede ser modificado por el sistema';
    end if;
  end if;

  return new;
end;
$$;

-- Corre después de trg_master_touch_lock y trg_master_touch_updated_at
create trigger trg_protect_master_touch_fields
  before update on public.master_touch_predictions
  for each row execute function public.protect_master_touch_fields();


-- ──────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.profiles                 enable row level security;
alter table public.matches                  enable row level security;
alter table public.predictions              enable row level security;
alter table public.master_touch_predictions enable row level security;


-- PROFILES
-- Lectura pública (leaderboard, ranking, avatares, nombres).
create policy "profiles: select all"
  on public.profiles for select
  using (true);

-- El dueño puede actualizar su fila; los triggers de protección definen
-- qué campos puede cambiar realmente (display_name, avatar_url, favorite_team, bio).
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- No hay política INSERT: el INSERT lo hace handle_new_user (security definer).
-- No hay política DELETE: los usuarios no pueden eliminar su propio perfil.


-- MATCHES
-- Lectura pública.
create policy "matches: select all"
  on public.matches for select
  using (true);

-- No hay política INSERT ni UPDATE desde el cliente.
-- Con RLS activo y sin política, usuarios normales no pueden escribir en matches.
-- Para cargar o actualizar partidos: usar service_role desde backend/admin.


-- PREDICTIONS
-- Regla de visibilidad:
--   - El dueño siempre ve sus propios pronósticos.
--   - Pronósticos ajenos son visibles solo después del cierre de la ventana:
--       pre_match → visible para todos desde matches.starts_at
--       live      → visible para todos desde matches.starts_at + 35 minutos
-- Esto evita copia de pronósticos antes del cierre y mantiene transparencia después.
create policy "predictions: select"
  on public.predictions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.matches m
      where m.id = match_id
        and (
          (prediction_mode = 'pre_match' and m.starts_at <= now())
          or (prediction_mode = 'live'   and m.starts_at + interval '35 minutes' <= now())
        )
    )
  );

-- El dueño puede insertar o actualizar sus pronósticos.
-- Los triggers validan ventanas de tiempo y protegen campos de sistema.
create policy "predictions: insert own"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "predictions: update own"
  on public.predictions for update
  using (auth.uid() = user_id);

-- No hay política DELETE: los usuarios no pueden borrar pronósticos.


-- MASTER TOUCH PREDICTIONS
-- Solo el dueño puede leer y escribir su Toque Maestro.
-- NOTA FUTURA: cuando el torneo termine, considerar abrir SELECT a todos
-- para comparar elecciones. Por ahora queda privado.
create policy "master_touch: select own"
  on public.master_touch_predictions for select
  using (auth.uid() = user_id);

create policy "master_touch: insert own"
  on public.master_touch_predictions for insert
  with check (auth.uid() = user_id);

create policy "master_touch: update own"
  on public.master_touch_predictions for update
  using (auth.uid() = user_id);

-- No hay política DELETE: los usuarios no pueden borrar su Toque Maestro.


-- ──────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- RLS controla qué filas puede ver/modificar cada usuario, pero los GRANTs
-- de PostgreSQL controlan si el rol tiene permiso de acceder a la tabla en
-- absoluto. En Supabase, tablas creadas por SQL Editor NO reciben GRANTs
-- automáticos — hay que otorgarlos explícitamente.
-- ──────────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

-- profiles: lectura pública, escritura solo al dueño (vía RLS)
grant select         on public.profiles                 to anon, authenticated;
grant update         on public.profiles                 to authenticated;

-- matches: lectura pública; escritura solo desde service_role (seed/admin)
grant select                    on public.matches to anon, authenticated;
grant select, insert, update    on public.matches to service_role;

-- predictions: el usuario autenticado puede leer, insertar y actualizar
grant select, insert, update on public.predictions              to authenticated;

-- master_touch_predictions: ídem predictions
grant select, insert, update on public.master_touch_predictions to authenticated;

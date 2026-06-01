-- ============================================================
-- SCHEMA V2 — Tablas del Mundial 2026
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. WORLDCUP_GROUPS
-- ────────────────────────────────────────────────────────────
create table if not exists public.worldcup_groups (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique  -- 'A' … 'L'
);

-- ────────────────────────────────────────────────────────────
-- 2. TEAMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id              uuid primary key default gen_random_uuid(),
  external_api_id text unique,
  name            text not null unique,
  short_name      text,
  country_code    text not null,   -- ISO 3166-1 alpha-2 (gb-sct, gb-eng para subcodes)
  group_id        uuid references public.worldcup_groups(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. PLAYERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  external_api_id text unique,
  team_id         uuid not null references public.teams(id) on delete cascade,
  name            text not null,
  position        text,          -- GK, DEF, MID, FWD
  shirt_number    smallint,
  photo_url       text,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. MATCH_EVENTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.match_events (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid not null references public.matches(id) on delete cascade,
  event_type         text not null,  -- goal | own_goal | penalty_goal | yellow_card | red_card | substitution
  minute             smallint,
  team_id            uuid references public.teams(id) on delete set null,
  player_id          uuid references public.players(id) on delete set null,
  player_name        text,
  assist_player_id   uuid references public.players(id) on delete set null,
  assist_player_name text,
  detail             text,
  created_at         timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. GROUP_STANDINGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.group_standings (
  id                   uuid primary key default gen_random_uuid(),
  group_id             uuid not null references public.worldcup_groups(id) on delete cascade,
  team_id              uuid not null references public.teams(id) on delete cascade,
  played               smallint not null default 0,
  won                  smallint not null default 0,
  drawn                smallint not null default 0,
  lost                 smallint not null default 0,
  goals_for            smallint not null default 0,
  goals_against        smallint not null default 0,
  goal_difference      smallint generated always as (goals_for - goals_against) stored,
  points               smallint not null default 0,
  qualification_status text not null default 'pending'
    check (qualification_status in ('pending','direct','third_place_candidate','third_place_qualified','eliminated')),
  updated_at           timestamptz not null default now(),
  unique (group_id, team_id)
);

-- ────────────────────────────────────────────────────────────
-- 6. TOP_SCORERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.top_scorers (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players(id) on delete cascade unique,
  team_id        uuid not null references public.teams(id) on delete cascade,
  goals          smallint not null default 0,
  assists        smallint,
  penalties      smallint not null default 0,
  matches_played smallint not null default 0,
  updated_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 7. MATCH_PROCESSING_LOG
-- ────────────────────────────────────────────────────────────
create table if not exists public.match_processing_log (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.matches(id) on delete cascade,
  process_type  text not null
    check (process_type in ('score_update','events_sync','points_calculation','standings_update','scorers_update')),
  status        text not null default 'pending'
    check (status in ('pending','success','failed')),
  processed_at  timestamptz not null default now(),
  error_message text,
  attempt_count smallint not null default 1,
  unique (match_id, process_type)
);

-- ────────────────────────────────────────────────────────────
-- 8. TOQUE_MAESTRO_PREDICTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.toque_maestro_predictions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade unique,
  champion_team_id      uuid references public.teams(id) on delete set null,
  runner_up_team_id     uuid references public.teams(id) on delete set null,
  golden_boot_player_id uuid references public.players(id) on delete set null,
  submitted_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  points                smallint,
  points_breakdown      jsonb
);

-- ────────────────────────────────────────────────────────────
-- 9. ALTER matches: agregar matchday + FKs de equipo
-- ────────────────────────────────────────────────────────────
alter table public.matches
  add column if not exists home_team_id uuid references public.teams(id) on delete set null,
  add column if not exists away_team_id uuid references public.teams(id) on delete set null,
  add column if not exists matchday     smallint;   -- 1, 2, 3 en fase de grupos

-- ============================================================
-- SEEDS
-- ============================================================

-- ── Grupos A-L ───────────────────────────────────────────────
insert into public.worldcup_groups (name) values
  ('A'),('B'),('C'),('D'),('E'),('F'),
  ('G'),('H'),('I'),('J'),('K'),('L')
on conflict (name) do nothing;

-- ── 48 selecciones (sorteo oficial FIFA, 05/12/2025) ────────
-- country_code: ISO 3166-1 alpha-2; GB subdivisions para ENG/SCO
insert into public.teams (name, short_name, country_code, group_id) values
  -- Grupo A
  ('Mexico',          'MEX', 'mx',     (select id from public.worldcup_groups where name='A')),
  ('South Africa',    'RSA', 'za',     (select id from public.worldcup_groups where name='A')),
  ('South Korea',     'KOR', 'kr',     (select id from public.worldcup_groups where name='A')),
  ('Czech Republic',  'CZE', 'cz',     (select id from public.worldcup_groups where name='A')),
  -- Grupo B
  ('Canada',                  'CAN', 'ca', (select id from public.worldcup_groups where name='B')),
  ('Bosnia and Herzegovina',  'BIH', 'ba', (select id from public.worldcup_groups where name='B')),
  ('Qatar',                   'QAT', 'qa', (select id from public.worldcup_groups where name='B')),
  ('Switzerland',             'SUI', 'ch', (select id from public.worldcup_groups where name='B')),
  -- Grupo C
  ('Brazil',   'BRA', 'br',     (select id from public.worldcup_groups where name='C')),
  ('Morocco',  'MAR', 'ma',     (select id from public.worldcup_groups where name='C')),
  ('Haiti',    'HAI', 'ht',     (select id from public.worldcup_groups where name='C')),
  ('Scotland', 'SCO', 'gb-sct', (select id from public.worldcup_groups where name='C')),
  -- Grupo D
  ('USA',       'USA', 'us', (select id from public.worldcup_groups where name='D')),
  ('Paraguay',  'PAR', 'py', (select id from public.worldcup_groups where name='D')),
  ('Australia', 'AUS', 'au', (select id from public.worldcup_groups where name='D')),
  ('Turkey',    'TUR', 'tr', (select id from public.worldcup_groups where name='D')),
  -- Grupo E
  ('Germany',     'GER', 'de', (select id from public.worldcup_groups where name='E')),
  ('Curacao',     'CUW', 'cw', (select id from public.worldcup_groups where name='E')),
  ('Ivory Coast', 'CIV', 'ci', (select id from public.worldcup_groups where name='E')),
  ('Ecuador',     'ECU', 'ec', (select id from public.worldcup_groups where name='E')),
  -- Grupo F
  ('Netherlands', 'NED', 'nl', (select id from public.worldcup_groups where name='F')),
  ('Japan',       'JPN', 'jp', (select id from public.worldcup_groups where name='F')),
  ('Sweden',      'SWE', 'se', (select id from public.worldcup_groups where name='F')),
  ('Tunisia',     'TUN', 'tn', (select id from public.worldcup_groups where name='F')),
  -- Grupo G
  ('Belgium',     'BEL', 'be', (select id from public.worldcup_groups where name='G')),
  ('Egypt',       'EGY', 'eg', (select id from public.worldcup_groups where name='G')),
  ('Iran',        'IRN', 'ir', (select id from public.worldcup_groups where name='G')),
  ('New Zealand', 'NZL', 'nz', (select id from public.worldcup_groups where name='G')),
  -- Grupo H
  ('Spain',        'ESP', 'es', (select id from public.worldcup_groups where name='H')),
  ('Cape Verde',   'CPV', 'cv', (select id from public.worldcup_groups where name='H')),
  ('Saudi Arabia', 'KSA', 'sa', (select id from public.worldcup_groups where name='H')),
  ('Uruguay',      'URU', 'uy', (select id from public.worldcup_groups where name='H')),
  -- Grupo I
  ('France',  'FRA', 'fr', (select id from public.worldcup_groups where name='I')),
  ('Senegal', 'SEN', 'sn', (select id from public.worldcup_groups where name='I')),
  ('Iraq',    'IRQ', 'iq', (select id from public.worldcup_groups where name='I')),
  ('Norway',  'NOR', 'no', (select id from public.worldcup_groups where name='I')),
  -- Grupo J
  ('Argentina', 'ARG', 'ar', (select id from public.worldcup_groups where name='J')),
  ('Algeria',   'ALG', 'dz', (select id from public.worldcup_groups where name='J')),
  ('Austria',   'AUT', 'at', (select id from public.worldcup_groups where name='J')),
  ('Jordan',    'JOR', 'jo', (select id from public.worldcup_groups where name='J')),
  -- Grupo K
  ('Portugal',   'POR', 'pt', (select id from public.worldcup_groups where name='K')),
  ('DR Congo',   'COD', 'cd', (select id from public.worldcup_groups where name='K')),
  ('Uzbekistan', 'UZB', 'uz', (select id from public.worldcup_groups where name='K')),
  ('Colombia',   'COL', 'co', (select id from public.worldcup_groups where name='K')),
  -- Grupo L
  ('England', 'ENG', 'gb-eng', (select id from public.worldcup_groups where name='L')),
  ('Croatia', 'CRO', 'hr',     (select id from public.worldcup_groups where name='L')),
  ('Ghana',   'GHA', 'gh',     (select id from public.worldcup_groups where name='L')),
  ('Panama',  'PAN', 'pa',     (select id from public.worldcup_groups where name='L'))
on conflict (name) do update set
  short_name   = excluded.short_name,
  country_code = excluded.country_code,
  group_id     = excluded.group_id;

-- ============================================================
-- BACKFILL matches: matchday + group_name + team FKs
-- ============================================================

-- Paso 1: guardar el matchday actual (group_name tiene '1','2','3')
update public.matches
set matchday = cast(group_name as smallint)
where phase = 'group'
  and group_name ~ '^\d+$';

-- Paso 2: actualizar group_name a la letra del grupo (via home_team)
update public.matches m
set
  group_name   = g.name,
  home_team_id = t.id
from public.teams t
join public.worldcup_groups g on g.id = t.group_id
where m.home_team = t.name
  and m.phase = 'group';

-- Paso 3: actualizar away_team_id
update public.matches m
set away_team_id = t.id
from public.teams t
where m.away_team = t.name
  and m.phase = 'group';

-- ============================================================
-- SEED group_standings — una fila por equipo, todo en 0
-- ============================================================
insert into public.group_standings (group_id, team_id)
select t.group_id, t.id
from public.teams t
where t.group_id is not null
on conflict (group_id, team_id) do nothing;

-- ============================================================
-- RLS
-- ============================================================
alter table public.worldcup_groups           enable row level security;
alter table public.teams                     enable row level security;
alter table public.players                   enable row level security;
alter table public.group_standings           enable row level security;
alter table public.top_scorers               enable row level security;
alter table public.match_events              enable row level security;
alter table public.match_processing_log      enable row level security;
alter table public.toque_maestro_predictions enable row level security;

-- Lectura pública
create policy "public_read_worldcup_groups"  on public.worldcup_groups  for select using (true);
create policy "public_read_teams"            on public.teams            for select using (true);
create policy "public_read_players"          on public.players          for select using (true);
create policy "public_read_group_standings"  on public.group_standings  for select using (true);
create policy "public_read_top_scorers"      on public.top_scorers      for select using (true);
create policy "public_read_match_events"     on public.match_events     for select using (true);

-- Toque Maestro: cada usuario solo ve y edita el suyo
create policy "toque_maestro_select" on public.toque_maestro_predictions
  for select using (auth.uid() = user_id);
create policy "toque_maestro_insert" on public.toque_maestro_predictions
  for insert with check (auth.uid() = user_id);
create policy "toque_maestro_update" on public.toque_maestro_predictions
  for update using (auth.uid() = user_id);

-- ============================================================
-- GRANTS service_role
-- ============================================================
grant select, insert, update        on public.worldcup_groups           to service_role;
grant select, insert, update        on public.teams                     to service_role;
grant select, insert, update        on public.players                   to service_role;
grant select, insert, update, delete on public.group_standings          to service_role;
grant select, insert, update        on public.top_scorers               to service_role;
grant select, insert, update, delete on public.match_events             to service_role;
grant select, insert, update, delete on public.match_processing_log     to service_role;
grant select, insert, update        on public.toque_maestro_predictions to service_role;

-- =========================================================
-- Esquema para Chat Pareja (Supabase)
-- Ejecutar esto COMPLETO en el SQL Editor de tu proyecto de Supabase.
-- Si ya habías corrido una versión anterior de este archivo, no pasa nada:
-- todos los "create table if not exists" / "add column if not exists" son
-- seguros de re-ejecutar.
-- =========================================================

-- Tabla de mensajes (persistencia real)
create table if not exists messages (
  id text primary key,
  chat_id text not null,
  sender text not null,
  text text not null,
  reply_to_id text,
  important boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Columnas nuevas que agrega la versión con: editar / borrar / pausas ("tiempo fuera")
alter table messages add column if not exists type text;
alter table messages add column if not exists edited boolean not null default false;
alter table messages add column if not exists deleted boolean not null default false;

create index if not exists idx_messages_chat_id on messages(chat_id);

-- Tabla de estado de usuario (mood persistente; el online/offline se maneja
-- con Presence de Supabase Realtime, no necesita tabla)
create table if not exists user_status (
  user_name text primary key,
  mood text not null default '😴',
  updated_at timestamptz not null default now()
);

-- Tabla de suscripciones push (para las notificaciones)
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_name text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_name);

-- Tabla de chequeos semanales ("¿Cómo estamos como pareja esta semana?")
create table if not exists weekly_checkins (
  user_name text not null,
  week_start date not null,
  mood text not null,
  comment text,
  created_at timestamptz not null default now(),
  primary key (user_name, week_start)
);

create index if not exists idx_weekly_checkins_week on weekly_checkins(week_start);

-- Habilitar Row Level Security (necesario en Supabase)
alter table messages enable row level security;
alter table user_status enable row level security;
alter table push_subscriptions enable row level security;
alter table weekly_checkins enable row level security;

-- Políticas: como el login ahora es con Supabase Auth real, exigimos que
-- el usuario esté autenticado (cualquier usuario logueado, ya que son
-- solo 2 personas de confianza). Si en el futuro querés restringir más
-- (ej. que cada quien solo pueda escribir mensajes con su propio nombre),
-- se puede endurecer usando auth.jwt() -> 'app_metadata' ->> 'display_name'.
drop policy if exists "public read messages" on messages;
drop policy if exists "authenticated read messages" on messages;
create policy "authenticated read messages" on messages for select
  using (auth.role() = 'authenticated');

drop policy if exists "public insert messages" on messages;
drop policy if exists "authenticated insert messages" on messages;
create policy "authenticated insert messages" on messages for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "public update messages" on messages;
drop policy if exists "authenticated update messages" on messages;
create policy "authenticated update messages" on messages for update
  using (auth.role() = 'authenticated');

drop policy if exists "public read user_status" on user_status;
drop policy if exists "authenticated read user_status" on user_status;
create policy "authenticated read user_status" on user_status for select
  using (auth.role() = 'authenticated');

drop policy if exists "public insert user_status" on user_status;
drop policy if exists "authenticated insert user_status" on user_status;
create policy "authenticated insert user_status" on user_status for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "public update user_status" on user_status;
drop policy if exists "authenticated update user_status" on user_status;
create policy "authenticated update user_status" on user_status for update
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated read push_subscriptions" on push_subscriptions;
create policy "authenticated read push_subscriptions" on push_subscriptions for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated insert push_subscriptions" on push_subscriptions;
create policy "authenticated insert push_subscriptions" on push_subscriptions for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated update push_subscriptions" on push_subscriptions;
create policy "authenticated update push_subscriptions" on push_subscriptions for update
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated read weekly_checkins" on weekly_checkins;
create policy "authenticated read weekly_checkins" on weekly_checkins for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated insert weekly_checkins" on weekly_checkins;
create policy "authenticated insert weekly_checkins" on weekly_checkins for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated update weekly_checkins" on weekly_checkins;
create policy "authenticated update weekly_checkins" on weekly_checkins for update
  using (auth.role() = 'authenticated');

-- Habilitar la replicación en tiempo real para estas tablas
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table user_status;
alter publication supabase_realtime add table weekly_checkins;

-- =========================================================
-- PASO MANUAL REQUERIDO: crear los 2 usuarios de login
-- =========================================================
-- 1) Andá a Authentication > Users en el panel de Supabase y creá 2
--    usuarios (botón "Add user"), con el email y contraseña que quieran
--    usar Leo y Estefi para entrar a la app. Anotá los emails.
--
-- 2) Después de crearlos, volvé acá al SQL Editor y corré esto,
--    reemplazando los emails por los reales que usaste:
--
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data || '{"display_name": "Leo"}'::jsonb
-- where email = 'EMAIL_DE_LEO_AQUI';
--
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data || '{"display_name": "Estefi"}'::jsonb
-- where email = 'EMAIL_DE_ESTEFI_AQUI';
--
-- Esto es lo que le permite a la app saber "quién sos" después de loguearte.

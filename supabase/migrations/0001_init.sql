-- Kineet initial schema
-- Mirrors lib/types/{campaign,provider,queue,notifications}.ts

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Profiles (lightweight mirror of auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Provider configs (Email / WhatsApp / SMS)
-- ============================================================
create table provider_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('email', 'whatsapp', 'sms')),
  status text not null default 'not_configured'
    check (status in ('not_configured','configured','connected','disconnected','error')),
  config jsonb not null default '{}',
  last_checked timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

-- ============================================================
-- 3. Campaigns
-- ============================================================
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  canal text not null check (canal in ('email','whatsapp','sms')),
  statut text not null default 'draft'
    check (statut in ('draft','queued','sending','paused','completed','failed')),
  message text not null,
  sujet text,
  progression numeric not null default 0,
  nombre_destinataires integer not null default 0,
  envoyes integer not null default 0,
  echoues integer not null default 0,
  en_attente integer not null default 0,
  duree integer,
  configuration jsonb,
  date_creation timestamptz not null default now(),
  date_envoi timestamptz,
  updated_at timestamptz not null default now()
);
create index idx_campaigns_user on campaigns(user_id);

-- ============================================================
-- 4. Recipients
-- ============================================================
create table recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  nom text not null,
  prenom text not null,
  contact text not null,
  email text,
  entreprise text,
  statut text not null default 'waiting'
    check (statut in ('waiting','sending','sent','failed','skipped')),
  heure_envoi timestamptz,
  nombre_tentatives integer not null default 0,
  message_personnalise text,
  erreur text,
  created_at timestamptz not null default now()
);
create index idx_recipients_campaign on recipients(campaign_id);

-- ============================================================
-- 5. Queue tasks (DB mirror of the sending queue for dashboard/realtime;
--    the actual worker runs via the background job runner (e.g. Trigger.dev/Inngest))
-- ============================================================
create table queue_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  recipient_id uuid not null references recipients(id) on delete cascade,
  canal text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text
);
create index idx_queue_tasks_campaign on queue_tasks(campaign_id);
create index idx_queue_tasks_status on queue_tasks(status);

-- ============================================================
-- 6. Notifications
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('success','error','info','warning')),
  category text not null,
  title text not null,
  message text not null,
  action_url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, read);

-- ============================================================
-- 7. Message templates
-- ============================================================
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  canal text not null check (canal in ('email','whatsapp','sms')),
  sujet text,
  contenu text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- updated_at triggers
-- ============================================================
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_provider_configs_updated_at
  before update on provider_configs
  for each row execute procedure public.set_updated_at();

create trigger set_campaigns_updated_at
  before update on campaigns
  for each row execute procedure public.set_updated_at();

create trigger set_message_templates_updated_at
  before update on message_templates
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table provider_configs enable row level security;
alter table campaigns enable row level security;
alter table recipients enable row level security;
alter table queue_tasks enable row level security;
alter table notifications enable row level security;
alter table message_templates enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id);

create policy "own provider_configs" on provider_configs
  for all using (auth.uid() = user_id);

create policy "own campaigns" on campaigns
  for all using (auth.uid() = user_id);

create policy "own notifications" on notifications
  for all using (auth.uid() = user_id);

create policy "own templates" on message_templates
  for all using (auth.uid() = user_id);

create policy "own recipients" on recipients
  for all using (
    exists (select 1 from campaigns c where c.id = recipients.campaign_id and c.user_id = auth.uid())
  );

create policy "own queue_tasks" on queue_tasks
  for all using (
    exists (select 1 from campaigns c where c.id = queue_tasks.campaign_id and c.user_id = auth.uid())
  );

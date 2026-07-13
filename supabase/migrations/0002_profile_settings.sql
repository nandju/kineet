-- Extends profiles with fields used by ProfilePanel, and adds per-user preferences
-- used by SettingsPanel (lib/kineet/types.ts Profile / Settings).

alter table profiles
  add column company text,
  add column phone text;

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  push_notifications boolean not null default false,
  campaign_reports boolean not null default true,
  dark_mode boolean not null default true,
  language text not null default 'Français',
  email_signature text not null default '',
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "own settings" on user_settings
  for all using (auth.uid() = user_id);

create trigger set_user_settings_updated_at
  before update on user_settings
  for each row execute procedure public.set_updated_at();

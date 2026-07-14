-- Reusable recipient lists ("listes de diffusion"), selectable when creating a campaign
-- as an alternative to manual entry / one-off Excel import.

create table distribution_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_distribution_lists_user on distribution_lists(user_id);

create table distribution_list_recipients (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references distribution_lists(id) on delete cascade,
  nom text not null,
  prenom text not null,
  contact text not null,
  email text,
  entreprise text,
  created_at timestamptz not null default now()
);
create index idx_dl_recipients_list on distribution_list_recipients(list_id);

alter table distribution_lists enable row level security;
alter table distribution_list_recipients enable row level security;

create policy "own distribution_lists" on distribution_lists
  for all using (auth.uid() = user_id);

create policy "own distribution_list_recipients" on distribution_list_recipients
  for all using (
    exists (
      select 1 from distribution_lists l
      where l.id = distribution_list_recipients.list_id and l.user_id = auth.uid()
    )
  );

create trigger set_distribution_lists_updated_at
  before update on distribution_lists
  for each row execute procedure public.set_updated_at();

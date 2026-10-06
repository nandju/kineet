-- Organisations cloisonnées (multi-tenant) + table support pour le super-admin.
--
-- Avant cette migration, tout est scopé par user_id (mono-tenant strict).
-- Après : campaigns / distribution_lists / provider_configs / message_templates
-- deviennent visibles par TOUS les membres d'une même organisation (pas
-- seulement leur créateur), via organization_id + appartenance à
-- organization_members. notifications / user_settings restent personnels
-- (déjà correctement sécurisés par auth.uid() = user_id) ; on leur ajoute
-- organization_id seulement à titre indicatif / pour filtrage d'affichage,
-- sans changer leur RLS.

-- ============================================================
-- 1. Organizations & membership
-- ============================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index idx_org_members_user on organization_members(user_id);

create table organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_org_invites_org on organization_invites(organization_id);

-- security definer: organization_members has its own RLS below that calls
-- this function, so the function itself must bypass RLS to avoid recursion.
create function public.is_org_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

create function public.is_org_role(org_id uuid, roles text[])
returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid() and role = any(roles)
  );
$$ language sql security definer set search_path = public;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invites enable row level security;

create policy "member can read own organizations" on organizations
  for select using (is_org_member(id));
create policy "owner/admin can update organization" on organizations
  for update using (is_org_role(id, array['owner', 'admin']));
create policy "authenticated can create organization" on organizations
  for insert with check (auth.uid() is not null);

create policy "member can read organization_members" on organization_members
  for select using (is_org_member(organization_id));
create policy "owner/admin can manage organization_members" on organization_members
  for insert with check (is_org_role(organization_id, array['owner', 'admin']));
create policy "owner/admin can update organization_members" on organization_members
  for update using (is_org_role(organization_id, array['owner', 'admin']));
create policy "owner/admin can remove organization_members" on organization_members
  for delete using (is_org_role(organization_id, array['owner', 'admin']));

create policy "member can read organization_invites" on organization_invites
  for select using (is_org_member(organization_id));
create policy "owner/admin can create organization_invites" on organization_invites
  for insert with check (is_org_role(organization_id, array['owner', 'admin']));
create policy "owner/admin can delete organization_invites" on organization_invites
  for delete using (is_org_role(organization_id, array['owner', 'admin']));

-- ============================================================
-- 2. organization_id sur les tables existantes
-- ============================================================
alter table campaigns add column organization_id uuid references organizations(id) on delete cascade;
alter table distribution_lists add column organization_id uuid references organizations(id) on delete cascade;
alter table provider_configs add column organization_id uuid references organizations(id) on delete cascade;
alter table message_templates add column organization_id uuid references organizations(id) on delete cascade;
alter table notifications add column organization_id uuid references organizations(id) on delete cascade;
alter table user_settings add column organization_id uuid references organizations(id) on delete cascade;

-- ============================================================
-- 3. Backfill : une organisation par utilisateur existant
-- ============================================================
do $$
declare
  u record;
  new_org_id uuid;
  org_name text;
begin
  for u in select id, full_name from profiles loop
    org_name := coalesce(nullif(trim(u.full_name), ''), 'Mon organisation');

    insert into organizations (name, slug, created_by)
    values (org_name, 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), u.id)
    returning id into new_org_id;

    insert into organization_members (organization_id, user_id, role)
    values (new_org_id, u.id, 'owner');

    update campaigns set organization_id = new_org_id where user_id = u.id and organization_id is null;
    update distribution_lists set organization_id = new_org_id where user_id = u.id and organization_id is null;
    update provider_configs set organization_id = new_org_id where user_id = u.id and organization_id is null;
    update message_templates set organization_id = new_org_id where user_id = u.id and organization_id is null;
    update notifications set organization_id = new_org_id where user_id = u.id and organization_id is null;
    update user_settings set organization_id = new_org_id where user_id = u.id and organization_id is null;
  end loop;
end $$;

-- Les tables métier partagées par une équipe deviennent obligatoirement rattachées.
alter table campaigns alter column organization_id set not null;
alter table distribution_lists alter column organization_id set not null;
alter table provider_configs alter column organization_id set not null;
alter table message_templates alter column organization_id set not null;
-- notifications / user_settings restent nullable (purement indicatif, pas de contrainte métier).

create index idx_campaigns_org on campaigns(organization_id);
create index idx_distribution_lists_org on distribution_lists(organization_id);
create index idx_provider_configs_org on provider_configs(organization_id);
create index idx_message_templates_org on message_templates(organization_id);

-- provider_configs était unique par (user_id, type) ; devient unique par organisation.
alter table provider_configs drop constraint if exists provider_configs_user_id_type_key;
alter table provider_configs add constraint provider_configs_org_type_key unique (organization_id, type);

-- ============================================================
-- 4. RLS : remplace "créateur uniquement" par "tout membre de l'organisation"
-- ============================================================
drop policy if exists "own campaigns" on campaigns;
create policy "org members can access campaigns" on campaigns
  for all using (is_org_member(organization_id));

drop policy if exists "own distribution_lists" on distribution_lists;
create policy "org members can access distribution_lists" on distribution_lists
  for all using (is_org_member(organization_id));

drop policy if exists "own provider_configs" on provider_configs;
create policy "org members can access provider_configs" on provider_configs
  for all using (is_org_member(organization_id));

drop policy if exists "own templates" on message_templates;
create policy "org members can access templates" on message_templates
  for all using (is_org_member(organization_id));

-- recipients / queue_tasks dérivent déjà de campaigns via EXISTS ; la policy
-- campaigns ci-dessus étant maintenant basée sur l'organisation, elles
-- héritent automatiquement du même cloisonnement sans modification.

-- distribution_list_recipients dérive de distribution_lists de la même façon
-- (policy existante inchangée, cf. 0003_distribution_lists.sql).

-- notifications / user_settings : RLS inchangée (auth.uid() = user_id), déjà correcte.

-- ============================================================
-- 5. Super-admin (chantier B) — table sans policy RLS : accessible
--    uniquement via la clé service role côté serveur, jamais via la clé
--    anonyme/authenticated du client.
-- ============================================================
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table platform_admins enable row level security;
-- Volontairement aucune policy : RLS activée + 0 policy = table invisible
-- pour les rôles anon/authenticated, seul service_role peut la lire/écrire.

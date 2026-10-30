-- Facturation par organisation via des liens de paiement SasPay, gérée
-- depuis un nouveau rôle plateforme "comptabilité" (en plus de "admin").
-- Un paiement confirmé prolonge organizations.paid_until ; les organisations
-- existantes restent à paid_until = null (non suivies, jamais bloquées) tant
-- que la comptabilité n'a pas généré de premier lien pour elles.

alter table platform_admins
  add column role text not null default 'admin' check (role in ('admin', 'comptabilite'));

alter table organizations
  add column paid_until timestamptz;

create table organization_payment_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  saspay_link_id text not null,
  slug text,
  name text not null,
  amount text not null,
  currency text not null default 'XOF',
  description text,
  extends_days integer not null default 30,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index idx_org_payment_links_org on organization_payment_links(organization_id);

-- Service-role only, comme platform_admins : c'est le registre interne de la
-- comptabilité (montants, historique de facturation), jamais exposé aux
-- membres de l'organisation via le dashboard.
alter table organization_payment_links enable row level security;

create table saspay_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  received_at timestamptz not null default now()
);

-- Journal d'audit, service-role only également.
alter table saspay_webhook_events enable row level security;

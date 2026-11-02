-- Journal des actions du super-admin (création/suppression d'organisation,
-- liens de paiement générés/annulés/confirmés) — complète la page Activité
-- qui agrège déjà campagnes, organisations, liens de paiement et webhooks
-- SasPay en un seul flux "tout ce qui se passe sur la plateforme".

create table platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  organization_id uuid references organizations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_platform_audit_log_created on platform_audit_log(created_at desc);

-- Service-role only, comme platform_admins / organization_payment_links.
alter table platform_audit_log enable row level security;

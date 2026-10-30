-- Envoi planifié : une campagne peut être créée avec un statut 'scheduled' et
-- une date future (scheduled_at). Une route cron (app/api/cron/send-scheduled-campaigns)
-- la fait passer par 'sending' puis 'completed' au moment voulu, indépendamment
-- du navigateur qui l'a créée.

alter table campaigns add column scheduled_at timestamptz;

alter table campaigns drop constraint campaigns_statut_check;
alter table campaigns add constraint campaigns_statut_check
  check (statut in ('draft', 'queued', 'scheduled', 'sending', 'paused', 'completed', 'failed'));

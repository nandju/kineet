-- Un platform_admin (super-admin ou comptabilité) n'appartient à aucune
-- organisation, par définition du rôle. Plutôt que de dépendre d'une
-- procédure manuelle (ex: toujours créer le compte avec skip_auto_org), on
-- l'impose en base : dès qu'une ligne est ajoutée à platform_admins, ses
-- éventuelles appartenances à des organisations sont retirées.

create or replace function public.enforce_platform_admin_no_org_membership()
returns trigger as $$
begin
  delete from organization_members where user_id = new.user_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_platform_admin_granted
  after insert on platform_admins
  for each row execute function public.enforce_platform_admin_no_org_membership();

-- handle_new_user_organization() fires on every auth.users insert, including
-- accounts created through the invite-activation flow — someone joining an
-- existing organization via invite doesn't need their own empty "Mon
-- organisation" cluttering their switcher on top of the one they just
-- joined. Skip auto-creation when the signup carries a skip_auto_org flag
-- (set by /api/organizations/invites/[token]/activate).

create or replace function public.handle_new_user_organization()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
begin
  if (new.raw_user_meta_data->>'skip_auto_org')::boolean is true then
    return new;
  end if;

  org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Mon organisation');

  insert into organizations (name, slug, created_by)
  values (org_name, 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), new.id)
  returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

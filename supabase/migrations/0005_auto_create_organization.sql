-- The 0004 migration backfilled one organization per *existing* user. This
-- adds the same behaviour going forward: every new signup automatically
-- gets a personal organization (as owner), mirroring how handle_new_user()
-- already auto-creates a profiles row. Users can still create additional
-- organizations later from the dashboard.

create function public.handle_new_user_organization()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Mon organisation');

  insert into organizations (name, slug, created_by)
  values (org_name, 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), new.id)
  returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created_organization
  after insert on auth.users
  for each row execute procedure public.handle_new_user_organization();

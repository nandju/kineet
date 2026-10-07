-- Audit finding: the organization_members UPDATE/DELETE policies only check
-- that the *caller* is owner/admin — they never check which row is being
-- touched. In practice this means any 'admin' member could, by calling the
-- API directly (the UI already hides this, but RLS is the real boundary),
-- demote or remove the organization's owner, or promote anyone (including
-- themselves) to 'owner'. This tightens both policies: the owner's own
-- membership row can't be touched through them, and no update can set a new
-- row to 'owner' (no silent self-promotion / duplicate ownership).

drop policy if exists "owner/admin can update organization_members" on organization_members;
create policy "owner/admin can update organization_members" on organization_members
  for update
  using (is_org_role(organization_id, array['owner', 'admin']) and role <> 'owner')
  with check (role <> 'owner');

drop policy if exists "owner/admin can remove organization_members" on organization_members;
create policy "owner/admin can remove organization_members" on organization_members
  for delete
  using (is_org_role(organization_id, array['owner', 'admin']) and role <> 'owner');

-- Second, more impactful finding: recipients / queue_tasks / distribution_list_recipients
-- still gate on the *creator's* user_id (via their parent campaign/list), not on
-- organization membership, even though campaigns and distribution_lists themselves
-- were correctly switched to org-wide access in 0004. A teammate other than the
-- original creator currently sees a campaign or list as existing but with zero
-- recipients/history — same symptom as the members-list bug, just not yet hit
-- because testing so far has been single-user-per-org.

drop policy if exists "own recipients" on recipients;
create policy "org members can access recipients" on recipients
  for all using (
    exists (select 1 from campaigns c where c.id = recipients.campaign_id and is_org_member(c.organization_id))
  );

drop policy if exists "own queue_tasks" on queue_tasks;
create policy "org members can access queue_tasks" on queue_tasks
  for all using (
    exists (select 1 from campaigns c where c.id = queue_tasks.campaign_id and is_org_member(c.organization_id))
  );

drop policy if exists "own distribution_list_recipients" on distribution_list_recipients;
create policy "org members can access distribution_list_recipients" on distribution_list_recipients
  for all using (
    exists (
      select 1 from distribution_lists l
      where l.id = distribution_list_recipients.list_id and is_org_member(l.organization_id)
    )
  );

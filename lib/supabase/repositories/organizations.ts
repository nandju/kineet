import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  role: OrganizationRole;
  name: string;
  email: string;
  createdAt: string;
}

export interface OrganizationInvite {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "organisation"}-${suffix}`;
}

/** Organizations the current signed-in user belongs to, most recently created first. */
export async function listMyOrganizations(supabase: SupabaseClient, userId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug, created_at)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => ({
      id: row.organizations?.id,
      name: row.organizations?.name,
      slug: row.organizations?.slug,
      role: row.role as OrganizationRole,
      createdAt: row.organizations?.created_at,
    }))
    .filter((org) => org.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Used by API routes that receive a client-supplied organizationId (e.g. WhatsApp session routes) to confirm the caller actually belongs to it before trusting it. */
export async function isOrganizationMember(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getOrganizationBySlug(supabase: SupabaseClient, slug: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at, organization_members(role, user_id)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const membership = (data as any).organization_members?.find((m: any) => m.user_id === user?.id);
  if (!membership) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    role: membership.role as OrganizationRole,
    createdAt: data.created_at,
  };
}

/**
 * Goes through /api/organizations/create (service-role, server-side) rather
 * than inserting directly: the creator's own "owner" membership row can't
 * satisfy the normal RLS insert policy for organization_members, which
 * requires already being an owner/admin of the org — impossible for a
 * brand-new org's first member.
 */
export async function createOrganization(
  _supabase: SupabaseClient,
  _userId: string,
  name: string,
): Promise<Organization> {
  const res = await fetch("/api/organizations/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "L'organisation n'a pas pu être créée.");
  return data.organization as Organization;
}

/**
 * Goes through /api/organizations/[id]/members (service-role) rather than
 * querying directly: there's no FK between organization_members and
 * profiles for PostgREST to embed, and profiles' own RLS only allows
 * reading your own row anyway — seeing teammates' names needs the
 * service-role client, gated server-side on actually being a member.
 */
export async function listMembers(_supabase: SupabaseClient, organizationId: string): Promise<OrganizationMember[]> {
  const res = await fetch(`/api/organizations/${organizationId}/members`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Impossible de charger les membres.");
  return (data.members as { userId: string; role: OrganizationRole; name: string; createdAt: string }[]).map((m) => ({
    ...m,
    email: "",
  }));
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeMember(supabase: SupabaseClient, organizationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Creates a shareable invite link; sending it to the invitee is a manual copy/share step for now (no transactional email infra yet). */
export async function createInvite(
  supabase: SupabaseClient,
  organizationId: string,
  invitedBy: string,
  email: string,
  role: OrganizationRole,
): Promise<OrganizationInvite> {
  const { data, error } = await supabase
    .from("organization_invites")
    .insert({ organization_id: organizationId, email, role, invited_by: invitedBy })
    .select("id, email, role, token, expires_at, created_at")
    .single();
  if (error) throw error;

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

export async function listInvites(supabase: SupabaseClient, organizationId: string): Promise<OrganizationInvite[]> {
  const { data, error } = await supabase
    .from("organization_invites")
    .select("id, email, role, token, expires_at, created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as OrganizationRole,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function deleteInvite(supabase: SupabaseClient, inviteId: string): Promise<void> {
  const { error } = await supabase.from("organization_invites").delete().eq("id", inviteId);
  if (error) throw error;
}

/**
 * Accepts an invite by token for the currently signed-in user. Looked up via
 * the service-role-backed /api/organizations/invites/accept route since the
 * invitee isn't a member yet and can't satisfy the normal RLS select policy
 * on organization_invites before joining.
 */
export async function acceptInvite(token: string): Promise<{ success: boolean; error?: string; slug?: string }> {
  const res = await fetch("/api/organizations/invites/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

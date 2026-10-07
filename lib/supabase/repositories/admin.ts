import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
}

export interface AdminOrganizationDetail extends AdminOrganizationSummary {
  members: { userId: string; role: string; name: string; createdAt: string }[];
  providers: { type: string; status: string; lastChecked: string | null }[];
  recentCampaigns: { id: string; nom: string; canal: string; statut: string; dateCreation: string }[];
}

/** All of these run against the service-role client (bypasses RLS by design) — admin-only, server-only. */
export async function adminListOrganizations(admin: SupabaseClient, search?: string): Promise<AdminOrganizationSummary[]> {
  let query = admin
    .from("organizations")
    .select("id, name, slug, created_at, organization_members(count)")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    memberCount: row.organization_members?.[0]?.count ?? 0,
  }));
}

export async function adminGetOrganization(admin: SupabaseClient, organizationId: string): Promise<AdminOrganizationDetail | null> {
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, slug, created_at")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!org) return null;

  const [{ data: members }, { data: providers }, { data: campaigns }] = await Promise.all([
    admin
      .from("organization_members")
      .select("user_id, role, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    admin
      .from("provider_configs")
      .select("type, status, last_checked")
      .eq("organization_id", organizationId),
    admin
      .from("campaigns")
      .select("id, nom, canal, statut, date_creation")
      .eq("organization_id", organizationId)
      .order("date_creation", { ascending: false })
      .limit(20),
  ]);

  // No FK between organization_members and profiles for PostgREST to embed — fetch and merge separately.
  const memberUserIds = (members ?? []).map((m) => m.user_id);
  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await admin.from("profiles").select("id, full_name").in("id", memberUserIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((memberProfiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.created_at,
    memberCount: members?.length ?? 0,
    members: (members ?? []).map((m: any) => ({
      userId: m.user_id,
      role: m.role,
      name: nameById.get(m.user_id) ?? "",
      createdAt: m.created_at,
    })),
    providers: (providers ?? []).map((p: any) => ({ type: p.type, status: p.status, lastChecked: p.last_checked })),
    recentCampaigns: (campaigns ?? []).map((c: any) => ({
      id: c.id,
      nom: c.nom,
      canal: c.canal,
      statut: c.statut,
      dateCreation: c.date_creation,
    })),
  };
}

export async function adminDeleteOrganization(admin: SupabaseClient, organizationId: string): Promise<void> {
  const { error } = await admin.from("organizations").delete().eq("id", organizationId);
  if (error) throw error;
}

export interface AdminLogEntry {
  id: string;
  kind: "campaign" | "queue_task";
  label: string;
  status: string;
  organizationName: string;
  createdAt: string;
}

/** Cross-organization activity feed built on existing tables — no dedicated audit-log table yet. */
export async function adminListRecentActivity(admin: SupabaseClient, limit = 50): Promise<AdminLogEntry[]> {
  const { data: campaigns, error } = await admin
    .from("campaigns")
    .select("id, nom, statut, date_creation, organizations(name)")
    .order("date_creation", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (campaigns ?? []).map((c: any) => ({
    id: c.id,
    kind: "campaign" as const,
    label: c.nom,
    status: c.statut,
    organizationName: c.organizations?.name ?? "—",
    createdAt: c.date_creation,
  }));
}

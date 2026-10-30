import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPaymentLink, getPaymentLinkTransactions, cancelPaymentLink } from "@/lib/saspay/client";

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

export interface AdminOrganizationBilling {
  id: string;
  name: string;
  slug: string;
  paidUntil: string | null;
}

/** For the Facturation section, accessible to both "admin" and "comptabilite" platform roles. */
export async function adminListOrganizationsBilling(admin: SupabaseClient, search?: string): Promise<AdminOrganizationBilling[]> {
  let query = admin
    .from("organizations")
    .select("id, name, slug, paid_until")
    .order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    paidUntil: row.paid_until,
  }));
}

export interface AdminPaymentLink {
  id: string;
  name: string;
  amount: string;
  currency: string;
  description: string | null;
  slug: string | null;
  status: "pending" | "paid" | "expired" | "cancelled";
  extendsDays: number;
  createdAt: string;
  paidAt: string | null;
}

export async function adminGetOrganizationBilling(
  admin: SupabaseClient,
  organizationId: string,
): Promise<AdminOrganizationBilling | null> {
  const { data, error } = await admin
    .from("organizations")
    .select("id, name, slug, paid_until")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, slug: data.slug, paidUntil: data.paid_until };
}

export async function adminListPaymentLinks(admin: SupabaseClient, organizationId: string): Promise<AdminPaymentLink[]> {
  const { data, error } = await admin
    .from("organization_payment_links")
    .select("id, name, amount, currency, description, slug, status, extends_days, created_at, paid_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    slug: row.slug,
    status: row.status,
    extendsDays: row.extends_days,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}

export async function adminCreatePaymentLink(
  admin: SupabaseClient,
  organizationId: string,
  input: { name: string; amount: string; currency: string; description?: string; extendsDays: number },
  createdBy: string,
): Promise<AdminPaymentLink> {
  const link = await createPaymentLink({
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
  });

  const { data, error } = await admin
    .from("organization_payment_links")
    .insert({
      organization_id: organizationId,
      saspay_link_id: link.id,
      slug: link.slug,
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      extends_days: input.extendsDays,
      created_by: createdBy,
    })
    .select("id, name, amount, currency, description, slug, status, extends_days, created_at, paid_at")
    .single();
  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    slug: data.slug,
    status: data.status,
    extendsDays: data.extends_days,
    createdAt: data.created_at,
    paidAt: data.paid_at,
  };
}

/**
 * The only reliable way to know a given link got paid: no documented field
 * ties a webhook or transaction back to its payment_link id, so this polls
 * the link's own transaction list instead of trusting webhook payloads.
 */
export async function adminRefreshPaymentLink(admin: SupabaseClient, linkId: string): Promise<AdminPaymentLink> {
  const { data: row, error } = await admin
    .from("organization_payment_links")
    .select("id, organization_id, saspay_link_id, name, amount, currency, description, slug, status, extends_days, created_at, paid_at")
    .eq("id", linkId)
    .single();
  if (error) throw error;

  if (row.status === "pending") {
    const { results } = await getPaymentLinkTransactions(row.saspay_link_id);
    const success = results.find((t) => t.status === "SUCCESS");

    if (success) {
      const paidAt = new Date().toISOString();
      const { data: org } = await admin.from("organizations").select("paid_until").eq("id", row.organization_id).maybeSingle();
      const base = org?.paid_until && new Date(org.paid_until) > new Date() ? new Date(org.paid_until) : new Date();
      const newPaidUntil = new Date(base.getTime() + row.extends_days * 24 * 60 * 60 * 1000).toISOString();

      await Promise.all([
        admin.from("organization_payment_links").update({ status: "paid", paid_at: paidAt }).eq("id", linkId),
        admin.from("organizations").update({ paid_until: newPaidUntil }).eq("id", row.organization_id),
      ]);

      return {
        id: row.id,
        name: row.name,
        amount: row.amount,
        currency: row.currency,
        description: row.description,
        slug: row.slug,
        status: "paid",
        extendsDays: row.extends_days,
        createdAt: row.created_at,
        paidAt,
      };
    }
  }

  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    slug: row.slug,
    status: row.status,
    extendsDays: row.extends_days,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

export async function adminCancelPaymentLink(admin: SupabaseClient, linkId: string): Promise<void> {
  const { data: row, error } = await admin
    .from("organization_payment_links")
    .select("saspay_link_id")
    .eq("id", linkId)
    .single();
  if (error) throw error;

  await cancelPaymentLink(row.saspay_link_id);
  await admin.from("organization_payment_links").update({ status: "cancelled" }).eq("id", linkId);
}

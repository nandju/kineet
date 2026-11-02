import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckoutSession, getCheckoutSession, cancelCheckoutSession } from "@/lib/saspay/client";

export const ADMIN_PAGE_SIZE = 10;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

function rangeFor(page: number, pageSize: number): [number, number] {
  const start = (Math.max(1, page) - 1) * pageSize;
  return [start, start + pageSize - 1];
}

function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page: Math.max(1, page), totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

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
export async function adminListOrganizations(
  admin: SupabaseClient,
  search?: string,
  page = 1,
): Promise<Paginated<AdminOrganizationSummary>> {
  let query = admin
    .from("organizations")
    .select("id, name, slug, created_at, organization_members(count)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error, count } = await query.range(...rangeFor(page, ADMIN_PAGE_SIZE));
  if (error) throw error;

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    memberCount: row.organization_members?.[0]?.count ?? 0,
  }));
  return paginate(items, count ?? items.length, page, ADMIN_PAGE_SIZE);
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

export interface AdminCampaignDetail {
  id: string;
  nom: string;
  canal: string;
  statut: string;
  message: string;
  sujet: string | null;
  dateCreation: string;
  organizationId: string;
  organizationName: string;
}

export interface AdminCampaignRecipient {
  id: string;
  nom: string;
  prenom: string;
  contact: string;
  statut: string;
  erreur: string | null;
}

/** Campaign content (not recipients, see adminListCampaignRecipients) — super-admin only ("admin"), not "comptabilite". */
export async function adminGetCampaignDetail(
  admin: SupabaseClient,
  organizationId: string,
  campaignId: string,
): Promise<AdminCampaignDetail | null> {
  const [{ data: campaign, error: campaignError }, { data: org }] = await Promise.all([
    admin
      .from("campaigns")
      .select("id, nom, canal, statut, message, sujet, date_creation")
      .eq("id", campaignId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
  ]);
  if (campaignError) throw campaignError;
  if (!campaign) return null;

  return {
    id: campaign.id,
    nom: campaign.nom,
    canal: campaign.canal,
    statut: campaign.statut,
    message: campaign.message,
    sujet: campaign.sujet,
    dateCreation: campaign.date_creation,
    organizationId,
    organizationName: org?.name ?? "",
  };
}

/** Target phone numbers / recipients for one campaign — super-admin only, same restriction as adminGetCampaignDetail. */
export async function adminListCampaignRecipients(
  admin: SupabaseClient,
  campaignId: string,
  page = 1,
): Promise<Paginated<AdminCampaignRecipient>> {
  const { data, error, count } = await admin
    .from("recipients")
    .select("id, nom, prenom, contact, statut, erreur", { count: "exact" })
    .eq("campaign_id", campaignId)
    .order("nom", { ascending: true })
    .range(...rangeFor(page, ADMIN_PAGE_SIZE));
  if (error) throw error;

  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    nom: r.nom,
    prenom: r.prenom,
    contact: r.contact,
    statut: r.statut,
    erreur: r.erreur,
  }));
  return paginate(items, count ?? items.length, page, ADMIN_PAGE_SIZE);
}

export interface AuditActor {
  id: string;
  email: string | null;
}

/** Fire-and-forget: never let a broken audit insert block the action it's logging. */
export async function logAdminAction(
  admin: SupabaseClient,
  entry: { actor: AuditActor; action: string; organizationId?: string | null; metadata?: Record<string, unknown> },
): Promise<void> {
  try {
    await admin.from("platform_audit_log").insert({
      actor_id: entry.actor.id,
      actor_email: entry.actor.email,
      action: entry.action,
      organization_id: entry.organizationId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // best-effort — the action itself already succeeded
  }
}

export async function adminDeleteOrganization(admin: SupabaseClient, organizationId: string, actor: AuditActor): Promise<void> {
  const { data: org } = await admin.from("organizations").select("name, slug").eq("id", organizationId).maybeSingle();

  const { error } = await admin.from("organizations").delete().eq("id", organizationId);
  if (error) throw error;

  // organization_id left null: the row no longer exists to reference.
  await logAdminAction(admin, {
    actor,
    action: "organization.deleted",
    metadata: { organizationId, name: org?.name, slug: org?.slug },
  });
}

export interface AdminLogEntry {
  id: string;
  kind: "campaign" | "organization_created" | "payment_link" | "webhook" | "admin_action";
  label: string;
  status: string;
  organizationName: string;
  actorEmail: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "organization.created": "Organisation créée",
  "organization.deleted": "Organisation supprimée",
  "payment_link.created": "Lien de paiement généré",
  "payment_link.cancelled": "Lien de paiement annulé",
  "payment_link.paid": "Paiement confirmé",
};

const LOG_FETCH_LIMIT = 100;

/**
 * Cross-entity activity feed: campaigns, organizations created, payment
 * links, SasPay webhook deliveries, and logged admin actions. These five
 * tables have no FK relating them, so there's no single query to page over —
 * each source is fetched independently (newest LOG_FETCH_LIMIT rows) and
 * merged/sorted/paginated in app code. For an internal admin tool at this
 * scale that's a fine trade: `total`/`totalPages` are a bound on what was
 * fetched, not an exact lifetime count once a single source exceeds the limit.
 */
export async function adminListPlatformLogs(admin: SupabaseClient, page = 1): Promise<Paginated<AdminLogEntry>> {
  const [{ data: campaigns }, { data: orgs }, { data: links }, { data: webhooks }, { data: actions }] = await Promise.all([
    admin
      .from("campaigns")
      .select("id, nom, statut, date_creation, organizations(name)")
      .order("date_creation", { ascending: false })
      .limit(LOG_FETCH_LIMIT),
    admin.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }).limit(LOG_FETCH_LIMIT),
    admin
      .from("organization_payment_links")
      .select("id, name, status, amount, currency, created_at, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(LOG_FETCH_LIMIT),
    admin
      .from("saspay_webhook_events")
      .select("id, event_type, signature_valid, received_at")
      .order("received_at", { ascending: false })
      .limit(LOG_FETCH_LIMIT),
    admin
      .from("platform_audit_log")
      .select("id, action, actor_email, created_at, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(LOG_FETCH_LIMIT),
  ]);

  const entries: AdminLogEntry[] = [
    ...(campaigns ?? []).map((c: any) => ({
      id: `campaign:${c.id}`,
      kind: "campaign" as const,
      label: c.nom,
      status: c.statut,
      organizationName: c.organizations?.name ?? "—",
      actorEmail: null,
      createdAt: c.date_creation,
    })),
    ...(orgs ?? []).map((o: any) => ({
      id: `organization:${o.id}`,
      kind: "organization_created" as const,
      label: o.name,
      status: "créée",
      organizationName: o.name,
      actorEmail: null,
      createdAt: o.created_at,
    })),
    ...(links ?? []).map((l: any) => ({
      id: `payment_link:${l.id}`,
      kind: "payment_link" as const,
      label: `${l.name} — ${l.amount} ${l.currency}`,
      status: l.status,
      organizationName: l.organizations?.name ?? "—",
      actorEmail: null,
      createdAt: l.created_at,
    })),
    ...(webhooks ?? []).map((w: any) => ({
      id: `webhook:${w.id}`,
      kind: "webhook" as const,
      label: `Webhook SasPay — ${w.event_type}`,
      status: w.signature_valid ? "valide" : "invalide",
      organizationName: "—",
      actorEmail: null,
      createdAt: w.received_at,
    })),
    ...(actions ?? []).map((a: any) => ({
      id: `action:${a.id}`,
      kind: "admin_action" as const,
      label: ACTION_LABELS[a.action] ?? a.action,
      status: "—",
      organizationName: a.organizations?.name ?? "—",
      actorEmail: a.actor_email,
      createdAt: a.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = entries.length;
  const [start, end] = rangeFor(page, ADMIN_PAGE_SIZE);
  return paginate(entries.slice(start, end + 1), total, page, ADMIN_PAGE_SIZE);
}

export interface AdminOrganizationBilling {
  id: string;
  name: string;
  slug: string;
  paidUntil: string | null;
}

/** For the Facturation section, accessible to both "admin" and "comptabilite" platform roles. */
export async function adminListOrganizationsBilling(
  admin: SupabaseClient,
  search?: string,
  page = 1,
): Promise<Paginated<AdminOrganizationBilling>> {
  let query = admin
    .from("organizations")
    .select("id, name, slug, paid_until", { count: "exact" })
    .order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error, count } = await query.range(...rangeFor(page, ADMIN_PAGE_SIZE));
  if (error) throw error;

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    paidUntil: row.paid_until,
  }));
  return paginate(items, count ?? items.length, page, ADMIN_PAGE_SIZE);
}

export interface AdminPaymentLink {
  id: string;
  name: string;
  amount: string;
  currency: string;
  description: string | null;
  url: string | null;
  status: "pending" | "paid" | "expired" | "cancelled";
  extendsDays: number;
  createdAt: string;
  paidAt: string | null;
}

function paymentLinkFromRow(row: any): AdminPaymentLink {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    url: row.url,
    status: row.status,
    extendsDays: row.extends_days,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

const PAYMENT_LINK_COLUMNS = "id, name, amount, currency, description, url, status, extends_days, created_at, paid_at";

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
    .select(PAYMENT_LINK_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(paymentLinkFromRow);
}

export async function adminCreatePaymentLink(
  admin: SupabaseClient,
  organizationId: string,
  input: {
    name: string;
    amount: string;
    currency: string;
    description?: string;
    extendsDays: number;
    customerName: string;
    customerEmail: string;
  },
  actor: AuditActor,
): Promise<AdminPaymentLink> {
  const session = await createCheckoutSession({
    amount: input.amount,
    currency: input.currency,
    description: input.description ?? input.name,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
  });

  const { data, error } = await admin
    .from("organization_payment_links")
    .insert({
      organization_id: organizationId,
      saspay_link_id: session.id,
      slug: session.slug,
      url: session.checkout_url,
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      extends_days: input.extendsDays,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      created_by: actor.id,
    })
    .select(PAYMENT_LINK_COLUMNS)
    .single();
  if (error) throw error;

  await logAdminAction(admin, {
    actor,
    action: "payment_link.created",
    organizationId,
    metadata: { linkId: data.id, name: input.name, amount: input.amount, currency: input.currency },
  });

  return paymentLinkFromRow(data);
}

/** The checkout session's own status is authoritative — no more guessing which transaction belongs to it. */
export async function adminRefreshPaymentLink(admin: SupabaseClient, linkId: string, actor: AuditActor): Promise<AdminPaymentLink> {
  const { data: row, error } = await admin
    .from("organization_payment_links")
    .select(`${PAYMENT_LINK_COLUMNS}, organization_id, saspay_link_id`)
    .eq("id", linkId)
    .single();
  if (error) throw error;

  if (row.status === "pending") {
    const session = await getCheckoutSession(row.saspay_link_id);

    if (session.status === "PAID") {
      const paidAt = new Date().toISOString();
      const { data: org } = await admin.from("organizations").select("paid_until").eq("id", row.organization_id).maybeSingle();
      const base = org?.paid_until && new Date(org.paid_until) > new Date() ? new Date(org.paid_until) : new Date();
      const newPaidUntil = new Date(base.getTime() + row.extends_days * 24 * 60 * 60 * 1000).toISOString();

      await Promise.all([
        admin.from("organization_payment_links").update({ status: "paid", paid_at: paidAt }).eq("id", linkId),
        admin.from("organizations").update({ paid_until: newPaidUntil }).eq("id", row.organization_id),
      ]);

      await logAdminAction(admin, {
        actor,
        action: "payment_link.paid",
        organizationId: row.organization_id,
        metadata: { linkId, name: row.name, amount: row.amount, currency: row.currency, newPaidUntil },
      });

      return paymentLinkFromRow({ ...row, status: "paid", paid_at: paidAt });
    }

    if (session.status === "EXPIRED" || session.status === "CANCELLED") {
      const status = session.status === "EXPIRED" ? "expired" : "cancelled";
      await admin.from("organization_payment_links").update({ status }).eq("id", linkId);
      return paymentLinkFromRow({ ...row, status });
    }
  }

  return paymentLinkFromRow(row);
}

export async function adminCancelPaymentLink(admin: SupabaseClient, linkId: string, actor: AuditActor): Promise<void> {
  const { data: row, error } = await admin
    .from("organization_payment_links")
    .select("saspay_link_id, organization_id, name")
    .eq("id", linkId)
    .single();
  if (error) throw error;

  await cancelCheckoutSession(row.saspay_link_id);
  await admin.from("organization_payment_links").update({ status: "cancelled" }).eq("id", linkId);

  await logAdminAction(admin, {
    actor,
    action: "payment_link.cancelled",
    organizationId: row.organization_id,
    metadata: { linkId, name: row.name },
  });
}

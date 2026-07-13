import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign, CampaignStatus } from "../../kineet/types";

const STATUS_TO_DB: Record<CampaignStatus, string> = {
  draft: "draft",
  sending: "sending",
  sent: "completed",
  failed: "failed",
};

const STATUS_FROM_DB: Record<string, CampaignStatus> = {
  draft: "draft",
  queued: "draft",
  sending: "sending",
  paused: "sending",
  completed: "sent",
  failed: "failed",
};

const SELECT_COLUMNS =
  "id, nom, canal, statut, message, sujet, nombre_destinataires, envoyes, echoues, date_creation";

interface CampaignRow {
  id: string;
  nom: string;
  canal: string;
  statut: string;
  message: string;
  sujet: string | null;
  nombre_destinataires: number;
  envoyes: number;
  echoues: number;
  date_creation: string;
}

function fromRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.nom,
    channel: row.canal as Campaign["channel"],
    status: STATUS_FROM_DB[row.statut] ?? "draft",
    recipients: row.nombre_destinataires,
    delivered: row.envoyes,
    failed: row.echoues,
    subject: row.sujet ?? undefined,
    message: row.message,
    createdAt: row.date_creation,
  };
}

export async function listCampaigns(supabase: SupabaseClient, userId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("date_creation", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/** Inserts the campaign and returns the persisted row (its `id` is DB-generated, not `campaign.id`). */
export async function insertCampaign(
  supabase: SupabaseClient,
  userId: string,
  campaign: Campaign,
): Promise<Campaign> {
  const pending = Math.max(campaign.recipients - campaign.delivered - campaign.failed, 0);
  const progression =
    campaign.recipients > 0
      ? Math.round(((campaign.delivered + campaign.failed) / campaign.recipients) * 100)
      : 0;

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      nom: campaign.name,
      canal: campaign.channel,
      statut: STATUS_TO_DB[campaign.status],
      message: campaign.message,
      sujet: campaign.subject ?? null,
      nombre_destinataires: campaign.recipients,
      envoyes: campaign.delivered,
      echoues: campaign.failed,
      en_attente: pending,
      progression,
      date_creation: campaign.createdAt,
      date_envoi: campaign.status !== "draft" ? campaign.createdAt : null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function updateCampaignRow(
  supabase: SupabaseClient,
  campaignId: string,
  updates: Partial<Campaign>,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.nom = updates.name;
  if (updates.channel !== undefined) patch.canal = updates.channel;
  if (updates.status !== undefined) patch.statut = STATUS_TO_DB[updates.status];
  if (updates.message !== undefined) patch.message = updates.message;
  if (updates.subject !== undefined) patch.sujet = updates.subject;
  if (updates.recipients !== undefined) patch.nombre_destinataires = updates.recipients;
  if (updates.delivered !== undefined) patch.envoyes = updates.delivered;
  if (updates.failed !== undefined) patch.echoues = updates.failed;

  const { error } = await supabase.from("campaigns").update(patch).eq("id", campaignId);
  if (error) throw error;
}

export async function deleteCampaignRow(supabase: SupabaseClient, campaignId: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
}

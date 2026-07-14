import type { SupabaseClient } from "@supabase/supabase-js";

export type RecipientStatus = "waiting" | "sending" | "sent" | "failed" | "skipped";

export interface RecipientRow {
  id: string;
  nom: string;
  prenom: string;
  contact: string;
  statut: RecipientStatus;
  erreur: string | null;
  heure_envoi: string | null;
}

export interface RecipientInput {
  nom: string;
  prenom: string;
  contact: string;
  statut: RecipientStatus;
  erreur?: string | null;
}

export async function insertRecipients(
  supabase: SupabaseClient,
  campaignId: string,
  recipients: RecipientInput[],
): Promise<void> {
  if (recipients.length === 0) return;

  const { error } = await supabase.from("recipients").insert(
    recipients.map((r) => ({
      campaign_id: campaignId,
      nom: r.nom,
      prenom: r.prenom,
      contact: r.contact,
      statut: r.statut,
      erreur: r.erreur ?? null,
      heure_envoi: r.statut === "sent" || r.statut === "failed" ? new Date().toISOString() : null,
    })),
  );
  if (error) throw error;
}

export async function listRecipients(supabase: SupabaseClient, campaignId: string): Promise<RecipientRow[]> {
  const { data, error } = await supabase
    .from("recipients")
    .select("id, nom, prenom, contact, statut, erreur, heure_envoi")
    .eq("campaign_id", campaignId)
    .order("nom", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

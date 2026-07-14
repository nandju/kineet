import type { SupabaseClient } from "@supabase/supabase-js";

export interface DistributionList {
  id: string;
  nom: string;
  description: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface DistributionListRecipientRow {
  id: string;
  nom: string;
  prenom: string;
  contact: string;
}

export interface DistributionListRecipientInput {
  nom: string;
  prenom: string;
  contact: string;
}

export async function listDistributionLists(
  supabase: SupabaseClient,
  userId: string,
): Promise<DistributionList[]> {
  const { data, error } = await supabase
    .from("distribution_lists")
    .select("id, nom, description, created_at, distribution_list_recipients(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    nom: row.nom,
    description: row.description,
    recipientCount: row.distribution_list_recipients?.[0]?.count ?? 0,
    createdAt: row.created_at,
  }));
}

export async function createDistributionList(
  supabase: SupabaseClient,
  userId: string,
  nom: string,
  description?: string,
): Promise<DistributionList> {
  const { data, error } = await supabase
    .from("distribution_lists")
    .insert({ user_id: userId, nom, description: description || null })
    .select("id, nom, description, created_at")
    .single();

  if (error) throw error;
  return { id: data.id, nom: data.nom, description: data.description, createdAt: data.created_at, recipientCount: 0 };
}

export async function deleteDistributionList(supabase: SupabaseClient, listId: string): Promise<void> {
  const { error } = await supabase.from("distribution_lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function listDistributionListRecipients(
  supabase: SupabaseClient,
  listId: string,
): Promise<DistributionListRecipientRow[]> {
  const { data, error } = await supabase
    .from("distribution_list_recipients")
    .select("id, nom, prenom, contact")
    .eq("list_id", listId)
    .order("nom", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addDistributionListRecipients(
  supabase: SupabaseClient,
  listId: string,
  recipients: DistributionListRecipientInput[],
): Promise<void> {
  if (recipients.length === 0) return;
  const { error } = await supabase.from("distribution_list_recipients").insert(
    recipients.map((r) => ({ list_id: listId, nom: r.nom, prenom: r.prenom, contact: r.contact })),
  );
  if (error) throw error;
}

export async function deleteDistributionListRecipient(supabase: SupabaseClient, recipientId: string): Promise<void> {
  const { error } = await supabase.from("distribution_list_recipients").delete().eq("id", recipientId);
  if (error) throw error;
}

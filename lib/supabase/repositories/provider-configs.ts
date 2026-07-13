import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnyProviderConfig, ProviderType, ProviderStatus } from "../../types/provider";

interface ProviderConfigRow {
  type: ProviderType;
  status: ProviderStatus;
  config: Record<string, unknown>;
  last_checked: string | null;
}

export async function getProviderConfig(
  supabase: SupabaseClient,
  userId: string,
  type: ProviderType,
): Promise<AnyProviderConfig | null> {
  const { data, error } = await supabase
    .from("provider_configs")
    .select("type, status, config, last_checked")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as ProviderConfigRow;
  return {
    type: row.type,
    status: row.status,
    lastChecked: row.last_checked ? new Date(row.last_checked) : undefined,
    ...row.config,
  } as AnyProviderConfig;
}

export async function upsertProviderConfig(
  supabase: SupabaseClient,
  userId: string,
  config: AnyProviderConfig,
): Promise<void> {
  const { type, status, lastChecked, ...rest } = config as AnyProviderConfig & Record<string, unknown>;
  const { error } = await supabase.from("provider_configs").upsert(
    {
      user_id: userId,
      type,
      status: status ?? "configured",
      config: rest,
      last_checked: new Date().toISOString(),
    },
    { onConflict: "user_id,type" },
  );
  if (error) throw error;
}

export async function setProviderStatus(
  supabase: SupabaseClient,
  userId: string,
  type: ProviderType,
  status: ProviderStatus,
): Promise<void> {
  const { error } = await supabase
    .from("provider_configs")
    .update({ status, last_checked: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("type", type);
  if (error) throw error;
}

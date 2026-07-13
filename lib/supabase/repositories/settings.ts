import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "../../kineet/types";

interface SettingsRow {
  email_notifications: boolean;
  push_notifications: boolean;
  campaign_reports: boolean;
  dark_mode: boolean;
  language: string;
  email_signature: string;
}

export async function getSettingsRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<SettingsRow | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("email_notifications, push_notifications, campaign_reports, dark_mode, language, email_signature")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function toSettings(row: SettingsRow | null): Settings {
  return {
    emailNotifications: row?.email_notifications ?? true,
    pushNotifications: row?.push_notifications ?? false,
    campaignReports: row?.campaign_reports ?? true,
    darkMode: row?.dark_mode ?? true,
    language: row?.language ?? "Français",
    emailSignature: row?.email_signature ?? "",
  };
}

export async function upsertSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings,
): Promise<void> {
  const { error } = await supabase.from("user_settings").upsert({
    user_id: userId,
    email_notifications: settings.emailNotifications,
    push_notifications: settings.pushNotifications,
    campaign_reports: settings.campaignReports,
    dark_mode: settings.darkMode,
    language: settings.language,
    email_signature: settings.emailSignature,
  });
  if (error) throw error;
}

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile } from "../../kineet/types";

interface ProfileRow {
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  phone: string | null;
}

export async function getProfile(supabase: SupabaseClient, user: User): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, company, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  const row = data as ProfileRow | null;

  return {
    name: row?.full_name ?? "",
    company: row?.company ?? "",
    phone: row?.phone ?? "",
    email: user.email ?? "",
    photo: row?.avatar_url ?? "",
  };
}

/** Email is not persisted here — it lives on auth.users and requires supabase.auth.updateUser(). */
export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: profile.name,
    company: profile.company,
    phone: profile.phone,
    avatar_url: profile.photo || null,
  });
  if (error) throw error;
}

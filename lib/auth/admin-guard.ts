import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAdminRole = "admin" | "comptabilite";

/**
 * Who's calling, and with which platform-level role — null if not signed in
 * or not in platform_admins. Centralizes a check that used to be copy-pasted
 * in app/admin/layout.tsx and app/api/admin/organizations/[id]/route.ts.
 */
export async function getPlatformAdminRole(): Promise<PlatformAdminRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("platform_admins").select("role").eq("user_id", user.id).maybeSingle();
    return (data?.role as PlatformAdminRole) ?? null;
  } catch {
    return null;
  }
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAdminRole = "admin" | "comptabilite";

export interface PlatformAdminActor {
  id: string;
  email: string | null;
  role: PlatformAdminRole;
}

/**
 * Who's calling, with which platform-level role and the identity needed to
 * attribute an audit-log entry to them — null if not signed in or not in
 * platform_admins.
 */
export async function getPlatformAdminActor(): Promise<PlatformAdminActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("platform_admins").select("role").eq("user_id", user.id).maybeSingle();
    if (!data?.role) return null;
    return { id: user.id, email: user.email ?? null, role: data.role as PlatformAdminRole };
  } catch {
    return null;
  }
}

/**
 * Role-only shorthand for getPlatformAdminActor() — used by pages/routes
 * that gate access but don't need to attribute actions to the caller.
 */
export async function getPlatformAdminRole(): Promise<PlatformAdminRole | null> {
  const actor = await getPlatformAdminActor();
  return actor?.role ?? null;
}

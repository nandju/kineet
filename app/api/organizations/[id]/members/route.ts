import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrganizationMember } from "@/lib/supabase/repositories/organizations";

/**
 * organization_members.user_id references auth.users, not profiles — there's
 * no FK PostgREST can use to embed `profiles(full_name)` in one query. Even
 * with a manual join, profiles' RLS only allows reading your own row, so
 * seeing teammates' names needs the service-role client. Membership is
 * checked first with the normal RLS-bound client so only actual members of
 * this org can call it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { id: organizationId } = await params;
  if (!(await isOrganizationMember(supabase, organizationId, user.id))) {
    return NextResponse.json({ success: false, error: "Organisation invalide." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: members, error: membersError } = await admin
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (membersError) {
    return NextResponse.json({ success: false, error: membersError.message }, { status: 500 });
  }

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await admin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return NextResponse.json({
    success: true,
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      name: nameById.get(m.user_id) ?? "",
      createdAt: m.created_at,
    })),
  });
}

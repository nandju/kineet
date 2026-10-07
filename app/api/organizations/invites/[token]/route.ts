import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public, unauthenticated check — the whole point is to let someone who
 * doesn't have an account yet see whether their invite link is still valid
 * before asking them to set a password. Never returns anything beyond
 * validity/email/org name; no sensitive data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from("organization_invites")
    .select("email, role, expires_at, accepted_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ success: false, error: "Ce lien d'invitation n'existe pas." }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ success: false, error: "Cette invitation a déjà été utilisée." }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: "Cette invitation a expiré." }, { status: 410 });
  }

  return NextResponse.json({
    success: true,
    email: invite.email,
    role: invite.role,
    organizationName: (invite as any).organizations?.name ?? "",
  });
}

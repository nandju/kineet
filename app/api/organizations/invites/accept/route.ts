import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { token } = (await request.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ success: false, error: "Lien d'invitation invalide." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("organization_invites")
    .select("id, organization_id, role, expires_at, accepted_at, organizations(slug)")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    return NextResponse.json({ success: false, error: inviteError.message }, { status: 500 });
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

  const { error: memberError } = await admin.from("organization_members").upsert(
    { organization_id: invite.organization_id, user_id: user.id, role: invite.role },
    { onConflict: "organization_id,user_id", ignoreDuplicates: true },
  );
  if (memberError) {
    return NextResponse.json({ success: false, error: memberError.message }, { status: 500 });
  }

  await admin.from("organization_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const slug = (invite as any).organizations?.slug;
  return NextResponse.json({ success: true, slug });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Turns a still-valid invite into a real account: creates the auth user for
 * the invited email with the chosen password (pre-confirmed — no email
 * round-trip), adds them to the organization, marks the invite used. If an
 * account already exists for that email, createUser fails with
 * code "email_exists" — that *is* the existence check, no separate lookup
 * needed (the admin API has no direct getUserByEmail).
 *
 * The session is established here, server-side, via signInWithPassword on
 * the cookie-bound client — not left to a second client-side call. A
 * client-side signInWithPassword right after admin-side account creation
 * was observed to hang indefinitely in testing rather than resolve.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };

  if (!password || password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("organization_invites")
    .select("id, email, organization_id, role, expires_at, accepted_at, organizations(slug)")
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

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { skip_auto_org: true },
  });

  if (createError) {
    if (createError.code === "email_exists") {
      return NextResponse.json(
        {
          success: false,
          error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous pour rejoindre l'organisation.",
          accountExists: true,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
  }
  if (!created.user) {
    return NextResponse.json({ success: false, error: "Le compte n'a pas pu être créé." }, { status: 500 });
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: invite.organization_id, user_id: created.user.id, role: invite.role });

  if (memberError) {
    // Don't leave a dangling account that isn't actually in the organization.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ success: false, error: memberError.message }, { status: 500 });
  }

  await admin.from("organization_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  // Establish the session now, on the cookie-bound client, so the browser
  // is already authenticated by the time this response comes back.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInError) {
    // Account + membership are already created; only the auto-login failed.
    // Not fatal — the client falls back to sending them to /login.
    return NextResponse.json({
      success: true,
      email: invite.email,
      slug: (invite as any).organizations?.slug,
      signedIn: false,
    });
  }

  const slug = (invite as any).organizations?.slug;
  return NextResponse.json({ success: true, email: invite.email, slug, signedIn: true });
}

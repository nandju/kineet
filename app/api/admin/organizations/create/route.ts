import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "organisation"}-${suffix}`;
}

/**
 * Super-admin-only: creates an organization without making the super-admin a
 * member of it (platform admins belong to no organization), then generates
 * an "admin" invite for the person designated as that organization's admin —
 * same mechanism as a regular team invite, just issued by the super-admin
 * instead of an existing member. Not "owner": organization_invites.role only
 * allows 'admin'/'member' (owner is assigned exclusively via organization
 * creation, see 0004_organizations.sql) — 'admin' already gives full
 * member-management rights, which is what matters here.
 */
export async function POST(request: Request) {
  const role = await getPlatformAdminRole();
  if (role !== "admin") {
    return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });
  }

  const { name, adminEmail } = (await request.json().catch(() => ({}))) as {
    name?: string;
    adminEmail?: string;
  };

  if (!name?.trim() || !adminEmail?.trim()) {
    return NextResponse.json({ success: false, error: "Nom et e-mail de l'admin requis." }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = slugify(name.trim());

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: name.trim(), slug })
    .select("id, name, slug")
    .single();

  if (orgError) {
    return NextResponse.json({ success: false, error: orgError.message }, { status: 500 });
  }

  const { data: invite, error: inviteError } = await admin
    .from("organization_invites")
    .insert({ organization_id: org.id, email: adminEmail.trim(), role: "owner" })
    .select("token")
    .single();

  if (inviteError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ success: false, error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, organization: org, inviteToken: invite.token });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * Creating an organization needs two writes: the organizations row, then the
 * creator's own "owner" membership row. The second insert can't go through
 * the normal RLS-bound client — the organization_members INSERT policy
 * requires already being an owner/admin of that org, which is impossible for
 * the very first member. Same bootstrapping problem as invite-acceptance, so
 * this uses the service-role client for the same reason.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { name } = (await request.json().catch(() => ({}))) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: "Nom requis." }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = slugify(name.trim());

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: name.trim(), slug, created_by: user.id })
    .select("id, name, slug, created_at")
    .single();

  if (orgError) {
    return NextResponse.json({ success: false, error: orgError.message }, { status: 500 });
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ success: false, error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    organization: { id: org.id, name: org.name, slug: org.slug, role: "owner", createdAt: org.created_at, paidUntil: null },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminDeleteOrganization } from "@/lib/supabase/repositories/admin";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? admin : null;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });
  }

  const { id } = await params;
  try {
    await adminDeleteOrganization(admin, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

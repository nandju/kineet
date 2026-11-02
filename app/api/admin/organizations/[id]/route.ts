import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminActor } from "@/lib/auth/admin-guard";
import { adminDeleteOrganization } from "@/lib/supabase/repositories/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getPlatformAdminActor();
  if (actor?.role !== "admin") {
    return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });
  }

  const { id } = await params;
  try {
    const admin = createAdminClient();
    await adminDeleteOrganization(admin, id, actor);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

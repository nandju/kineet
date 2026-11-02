import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminActor } from "@/lib/auth/admin-guard";
import { adminCancelPaymentLink } from "@/lib/supabase/repositories/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const actor = await getPlatformAdminActor();
  if (!actor) return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });

  const { linkId } = await params;
  try {
    const admin = createAdminClient();
    await adminCancelPaymentLink(admin, linkId, actor);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminCancelPaymentLink } from "@/lib/supabase/repositories/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const role = await getPlatformAdminRole();
  if (!role) return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 404 });

  const { linkId } = await params;
  try {
    const admin = createAdminClient();
    await adminCancelPaymentLink(admin, linkId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

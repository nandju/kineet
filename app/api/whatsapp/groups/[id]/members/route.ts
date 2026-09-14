import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGroupMembers } from "@/lib/server/whatsapp/session-manager";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const members = await listGroupMembers(user.id, decodeURIComponent(id));
    return NextResponse.json({ success: true, members });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 400 },
    );
  }
}

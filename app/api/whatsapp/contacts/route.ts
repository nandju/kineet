import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/server/whatsapp/session-manager";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  try {
    const contacts = await listContacts(user.id);
    return NextResponse.json({ success: true, contacts });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 400 },
    );
  }
}

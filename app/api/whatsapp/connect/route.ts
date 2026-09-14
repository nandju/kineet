import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { connectSession } from "@/lib/server/whatsapp/session-manager";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const state = await connectSession(user.id);
  return NextResponse.json({ success: true, ...state });
}

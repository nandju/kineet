import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOrganizationMember } from "@/lib/supabase/repositories/organizations";
import { whatsappService } from "@/lib/server/whatsapp/service-client";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { organizationId } = (await request.json().catch(() => ({}))) as { organizationId?: string };
  if (!organizationId || !(await isOrganizationMember(supabase, organizationId, user.id))) {
    return NextResponse.json({ success: false, error: "Organisation invalide." }, { status: 403 });
  }

  try {
    const { data, status } = await whatsappService.connect(organizationId);
    return NextResponse.json(data, { status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erreur inconnue." },
      { status: 503 },
    );
  }
}

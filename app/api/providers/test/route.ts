import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderConfig, setProviderStatus } from "@/lib/supabase/repositories/provider-configs";
import { isOrganizationMember } from "@/lib/supabase/repositories/organizations";
import { testSmtpConnection } from "@/lib/server/providers/smtp";
import { testTextBeeConfig } from "@/lib/server/providers/textbee";
import type { EmailConfig, SmsConfig, ProviderType } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401 });
  }

  const { type, organizationId } = (await request.json()) as { type: ProviderType; organizationId: string };

  if (!organizationId || !(await isOrganizationMember(supabase, organizationId, user.id))) {
    return NextResponse.json({ success: false, message: "Organisation invalide." }, { status: 403 });
  }

  const config = await getProviderConfig(supabase, organizationId, type);
  if (!config) {
    return NextResponse.json({ success: false, message: "Aucune configuration trouvée." }, { status: 404 });
  }

  const result =
    type === "email"
      ? await testSmtpConnection(config as EmailConfig)
      : type === "sms"
        ? await testTextBeeConfig(config as SmsConfig)
        : { success: false, message: "Ce fournisseur n'a pas encore d'intégration réelle." };

  await setProviderStatus(supabase, organizationId, type, result.success ? "connected" : "error");

  return NextResponse.json(result);
}

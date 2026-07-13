import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderConfig } from "@/lib/supabase/repositories/provider-configs";
import { sendSmtpEmail } from "@/lib/server/providers/smtp";
import { sendTextBeeSms } from "@/lib/server/providers/textbee";
import type { EmailConfig, SmsConfig } from "@/lib/types";

interface SendRequestBody {
  channel: "email" | "sms";
  to: string;
  subject?: string;
  message: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié." }, { status: 401 });
  }

  const { channel, to, subject, message } = (await request.json()) as SendRequestBody;

  if (channel === "email") {
    const config = await getProviderConfig(supabase, user.id, "email");
    if (!config) {
      return NextResponse.json({ success: false, error: "Fournisseur e-mail non configuré." }, { status: 400 });
    }
    const result = await sendSmtpEmail(config as EmailConfig, to, subject ?? "", message);
    return NextResponse.json(result);
  }

  if (channel === "sms") {
    const config = await getProviderConfig(supabase, user.id, "sms");
    if (!config) {
      return NextResponse.json({ success: false, error: "Fournisseur SMS non configuré." }, { status: 400 });
    }
    const result = await sendTextBeeSms(config as SmsConfig, to, message);
    return NextResponse.json(result);
  }

  return NextResponse.json({ success: false, error: "Canal non pris en charge." }, { status: 400 });
}

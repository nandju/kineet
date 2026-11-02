import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderConfig } from "@/lib/supabase/repositories/provider-configs";
import { listWaitingRecipients, updateRecipientStatus } from "@/lib/supabase/repositories/recipients";
import { sendSmtpEmail } from "@/lib/server/providers/smtp";
import { sendTextBeeSms } from "@/lib/server/providers/textbee";
import { replaceVariables } from "@/lib/kineet/campaign-utils";
import type { EmailConfig, SmsConfig } from "@/lib/types";

/**
 * Triggered by Vercel Cron (see vercel.json). Finds campaigns scheduled in
 * the past and sends them server-side — independent of any open browser tab,
 * unlike the interactive wizard in new-campaign-panel.tsx which sends from
 * the client. Only email/sms: WhatsApp sending isn't implemented server-side
 * (the wizard's WhatsApp path is a client-side simulation).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  const authorized = !!secret && authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: dueCampaigns, error } = await admin
    .from("campaigns")
    .select("id, organization_id, canal, sujet, message, statut")
    .eq("statut", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const results: { campaignId: string; sent: number; failed: number; skipped?: string }[] = [];

  for (const campaign of dueCampaigns ?? []) {
    const { data: org } = await admin
      .from("organizations")
      .select("paid_until")
      .eq("id", campaign.organization_id)
      .maybeSingle();

    if (!org?.paid_until || new Date(org.paid_until) < new Date()) {
      results.push({ campaignId: campaign.id, sent: 0, failed: 0, skipped: "aucun abonnement actif" });
      continue;
    }

    await admin.from("campaigns").update({ statut: "sending" }).eq("id", campaign.id);

    const recipients = await listWaitingRecipients(admin, campaign.id);
    let sent = 0;
    let failed = 0;

    if (campaign.canal === "email") {
      const config = (await getProviderConfig(admin, campaign.organization_id, "email")) as EmailConfig | null;
      for (const recipient of recipients) {
        if (!config) {
          await updateRecipientStatus(admin, recipient.id, "failed", "Fournisseur e-mail non configuré.");
          failed++;
          continue;
        }
        const body = replaceVariables(campaign.message, { firstName: recipient.prenom, lastName: recipient.nom });
        const result = await sendSmtpEmail(config, recipient.contact, campaign.sujet ?? "", body);
        await updateRecipientStatus(admin, recipient.id, result.success ? "sent" : "failed", result.success ? null : result.error);
        result.success ? sent++ : failed++;
      }
    } else if (campaign.canal === "sms") {
      const config = (await getProviderConfig(admin, campaign.organization_id, "sms")) as SmsConfig | null;
      for (const recipient of recipients) {
        if (!config) {
          await updateRecipientStatus(admin, recipient.id, "failed", "Fournisseur SMS non configuré.");
          failed++;
          continue;
        }
        const body = replaceVariables(campaign.message, { firstName: recipient.prenom, lastName: recipient.nom });
        const result = await sendTextBeeSms(config, recipient.contact, body);
        await updateRecipientStatus(admin, recipient.id, result.success ? "sent" : "failed", result.success ? null : result.error);
        result.success ? sent++ : failed++;
      }
    }

    await admin
      .from("campaigns")
      .update({ statut: "completed", envoyes: sent, echoues: failed, en_attente: 0 })
      .eq("id", campaign.id);

    results.push({ campaignId: campaign.id, sent, failed });
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}

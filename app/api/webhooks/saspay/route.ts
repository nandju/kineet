import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_CLOCK_SKEW_SECONDS = 300;

/**
 * Verifies and logs SasPay webhook deliveries (X-Webhook-Signature = hex
 * HMAC-SHA256 of "{timestamp}.{raw_body}", X-Webhook-Timestamp = unix
 * seconds). This route does NOT drive the paid_until extension itself — no
 * documented field ties a transaction.success payload back to the
 * payment_link id that produced it, so that state change happens via an
 * explicit GET /payment-links/{id}/transactions/ poll instead (see
 * adminRefreshPaymentLink). This route exists for the required signature
 * verification and for audit history.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const eventType = request.headers.get("x-webhook-event") ?? "unknown";
  const rawBody = await request.text();

  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  let signatureValid = false;

  if (signature && timestamp && secret) {
    const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (skew <= MAX_CLOCK_SKEW_SECONDS) {
      const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
      const expectedBuf = Buffer.from(expected, "hex");
      const receivedBuf = Buffer.from(signature, "hex");
      signatureValid = expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = { raw: rawBody };
  }

  const admin = createAdminClient();
  await admin.from("saspay_webhook_events").insert({
    event_type: eventType,
    payload,
    signature_valid: signatureValid,
  });

  if (!signatureValid) {
    return NextResponse.json({ success: false, error: "Signature invalide." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}

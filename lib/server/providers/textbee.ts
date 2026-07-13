import type { SmsConfig, MessageResult, ProviderTestResult } from "../../types";

/**
 * Server-only client for TextBee (https://textbee.dev) — turns an Android phone
 * into an SMS gateway. API confirmed against textbee.dev/docs/sending-sms.
 */
const TEXTBEE_BASE_URL = "https://api.textbee.dev/api/v1";

export async function testTextBeeConfig(config: SmsConfig): Promise<ProviderTestResult> {
  if (!config.apiKey?.trim()) {
    return { success: false, message: "Clé API TextBee requise." };
  }
  if (!config.androidDeviceId?.trim()) {
    return { success: false, message: "Identifiant d'appareil TextBee requis." };
  }
  // TextBee ne publie pas d'endpoint public de statut d'appareil : on ne peut
  // valider que le format de la configuration ici. La vraie connexion est
  // vérifiée au premier envoi réel.
  return {
    success: true,
    message: "Configuration valide. La connexion réelle sera confirmée au premier envoi.",
  };
}

export async function sendTextBeeSms(config: SmsConfig, to: string, message: string): Promise<MessageResult> {
  if (!config.androidDeviceId) {
    return { success: false, error: "Identifiant d'appareil TextBee manquant.", timestamp: new Date() };
  }

  try {
    const res = await fetch(`${TEXTBEE_BASE_URL}/gateway/devices/${config.androidDeviceId}/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": config.apiKey },
      body: JSON.stringify({ recipients: [to], message }),
    });

    const data = await res.json().catch(() => ({}) as any);

    if (!res.ok) {
      return {
        success: false,
        error: data?.message ?? `TextBee a répondu ${res.status}.`,
        timestamp: new Date(),
      };
    }

    return { success: true, messageId: data?.data?._id ?? data?.data?.id, timestamp: new Date() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur réseau TextBee.",
      timestamp: new Date(),
    };
  }
}

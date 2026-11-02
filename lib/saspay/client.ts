import "server-only";

const SASPAY_BASE_URL = "https://api.saspay.me/api/v1";

export interface SasPayCheckoutSession {
  id: string;
  slug: string;
  checkout_url: string;
  amount: string;
  currency: string;
  description: string | null;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  customer_email: string;
  customer_name: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SasPaySuccess<T> {
  success: true;
  data: T;
  code: number;
}

interface SasPayFailure {
  success: false;
  error: { message: string; code: string } | Record<string, string[]>;
  code: number;
}

function getSecretKey(): string {
  const key = process.env.SASPAY_SECRET_KEY;
  if (!key) throw new Error("SASPAY_SECRET_KEY manquant côté serveur.");
  return key;
}

async function saspayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SASPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as SasPaySuccess<T> | SasPayFailure;

  if (!body.success) {
    const message =
      "message" in body.error ? body.error.message : "Requête SasPay invalide.";
    throw new Error(`SasPay (${res.status}): ${message}`);
  }

  return body.data;
}

/**
 * POST /checkout-sessions/ — utilisé à la place de /payment-links/ : seul
 * endpoint SasPay dont la réponse documente une vraie URL publique hébergée
 * (checkout_url, pay.saspay.me/checkout/{slug}). Les liens de paiement ne
 * renvoient aucun champ d'URL documenté, donc inutilisables tels quels pour
 * donner un lien partageable au client.
 */
export async function createCheckoutSession(input: {
  amount: string;
  currency: string;
  description?: string;
  customerName: string;
  customerEmail: string;
}): Promise<SasPayCheckoutSession> {
  return saspayFetch<SasPayCheckoutSession>("/checkout-sessions/", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
    }),
  });
}

/** GET /checkout-sessions/{id}/ — son statut (status) fait foi directement, pas besoin de chercher une transaction associée. */
export async function getCheckoutSession(sessionId: string): Promise<SasPayCheckoutSession> {
  return saspayFetch<SasPayCheckoutSession>(`/checkout-sessions/${sessionId}/`);
}

/** POST /checkout-sessions/{id}/cancel/ */
export async function cancelCheckoutSession(sessionId: string): Promise<void> {
  const res = await fetch(`${SASPAY_BASE_URL}/checkout-sessions/${sessionId}/cancel/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`SasPay (${res.status}): annulation de la session impossible.`);
  }
}

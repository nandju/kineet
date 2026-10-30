import "server-only";

const SASPAY_BASE_URL = "https://api.saspay.me/api/v1";

export interface SasPayPaymentLink {
  id: string;
  slug: string;
  name: string;
  amount: string | null;
  currency: string;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SasPayTransaction {
  id: string;
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  requested_amount: string;
  currency: string;
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

/** POST /payment-links/ — pas de header Idempotency-Key, la doc dit explicitement qu'il n'est pas supporté ici. */
export async function createPaymentLink(input: {
  name: string;
  amount: string;
  currency: string;
  description?: string;
}): Promise<SasPayPaymentLink> {
  return saspayFetch<SasPayPaymentLink>("/payment-links/", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      amount_type: "FIXED",
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      show_confirmation_page: true,
    }),
  });
}

/** GET /payment-links/{id}/transactions/ — seule source fiable pour savoir si un lien donné a été payé (aucun champ documenté ne relie un webhook à son lien d'origine). */
export async function getPaymentLinkTransactions(
  linkId: string,
  page = 1,
): Promise<{ count: number; results: SasPayTransaction[] }> {
  return saspayFetch(`/payment-links/${linkId}/transactions/?page=${page}`);
}

/** DELETE /payment-links/{id}/ — désactive le lien ; les transactions déjà créées via ce lien ne sont pas affectées. Réponse 204 sans corps, donc pas de parsing JSON ici. */
export async function cancelPaymentLink(linkId: string): Promise<void> {
  const res = await fetch(`${SASPAY_BASE_URL}/payment-links/${linkId}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  if (res.status !== 204 && res.status !== 404) {
    throw new Error(`SasPay (${res.status}): annulation du lien impossible.`);
  }
}

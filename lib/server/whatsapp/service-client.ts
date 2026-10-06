const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const SERVICE_API_KEY = process.env.WHATSAPP_SERVICE_API_KEY;

interface ServiceResponse {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

async function callService(path: string, init?: RequestInit): Promise<ServiceResponse> {
  if (!SERVICE_URL || !SERVICE_API_KEY) {
    throw new Error("Le service WhatsApp n'est pas configuré (WHATSAPP_SERVICE_URL / WHATSAPP_SERVICE_API_KEY manquants).");
  }

  const res = await fetch(`${SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-service-key": SERVICE_API_KEY,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ success: false, error: "Réponse invalide du service WhatsApp." }));
  return { ok: res.ok, status: res.status, data };
}

export const whatsappService = {
  connect: (userId: string) => callService(`/sessions/${userId}/connect`, { method: "POST" }),
  status: (userId: string) => callService(`/sessions/${userId}/status`),
  disconnect: (userId: string) => callService(`/sessions/${userId}/disconnect`, { method: "POST" }),
  groups: (userId: string) => callService(`/sessions/${userId}/groups`),
  groupMembers: (userId: string, groupId: string) =>
    callService(`/sessions/${userId}/groups/${encodeURIComponent(groupId)}/members`),
  contacts: (userId: string) => callService(`/sessions/${userId}/contacts`),
};

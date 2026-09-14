import { create, ev, STATE, type Client, type GroupChatId } from "@open-wa/wa-automate";

export type WhatsAppSessionStatus = "connecting" | "qr" | "connected" | "disconnected" | "error";

interface SessionState {
  status: WhatsAppSessionStatus;
  qr?: string;
  number?: string;
  client?: Client;
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __waSessions: Map<string, SessionState> | undefined;
  // eslint-disable-next-line no-var
  var __waQrListenerRegistered: boolean | undefined;
}

const sessions = globalThis.__waSessions ?? (globalThis.__waSessions = new Map<string, SessionState>());

// Registered once per process: `ev` is a shared emitter across every open-wa
// session, events are namespaced as `qr.<sessionId>` (sessionId = our userId).
if (!globalThis.__waQrListenerRegistered) {
  globalThis.__waQrListenerRegistered = true;
  ev.on("qr.**", (qrDataUrl: string, sessionId: string) => {
    const session = sessions.get(sessionId);
    if (session && session.status !== "connected") {
      session.qr = qrDataUrl;
      session.status = "qr";
    }
  });
}

export interface PublicSessionState {
  status: WhatsAppSessionStatus;
  qr?: string;
  number?: string;
  error?: string;
}

function toPublic(state: SessionState): PublicSessionState {
  return { status: state.status, qr: state.qr, number: state.number, error: state.error };
}

export function getSession(userId: string): PublicSessionState {
  const session = sessions.get(userId);
  return session ? toPublic(session) : { status: "disconnected" };
}

export async function connectSession(userId: string): Promise<PublicSessionState> {
  const existing = sessions.get(userId);
  if (existing && existing.status !== "disconnected" && existing.status !== "error") {
    return toPublic(existing);
  }

  const state: SessionState = { status: "connecting" };
  sessions.set(userId, state);

  create({
    sessionId: userId,
    headless: true,
    qrTimeout: 0,
    authTimeout: 0,
    cacheEnabled: true,
    popup: false,
    useChrome: false,
  })
    .then(async (client) => {
      state.client = client;
      state.status = "connected";
      state.qr = undefined;
      try {
        state.number = await client.getHostNumber();
      } catch {
        // number stays unset if the lib can't resolve it — not fatal
      }
      client.onStateChanged((s) => {
        if (s === STATE.UNPAIRED || s === STATE.UNLAUNCHED) {
          state.status = "disconnected";
        }
      });
    })
    .catch((err) => {
      state.status = "error";
      state.error = err instanceof Error ? err.message : String(err);
    });

  return toPublic(state);
}

export async function disconnectSession(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (session?.client) {
    try {
      await session.client.kill();
    } catch {
      // already dead — nothing to clean up
    }
  }
  sessions.delete(userId);
}

function requireClient(userId: string): Client {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected" || !session.client) {
    throw new Error("WhatsApp non connecté.");
  }
  return session.client;
}

export interface WhatsAppGroupSummary {
  id: string;
  name: string;
  participantCount: number;
}

export interface WhatsAppContactSummary {
  id: string;
  name: string;
  number: string;
}

function toContactSummary(contact: { id: string; name?: string; pushname?: string; formattedName?: string }): WhatsAppContactSummary {
  const number = typeof contact.id === "string" ? contact.id.split("@")[0] : "";
  return {
    id: contact.id,
    name: contact.name || contact.pushname || contact.formattedName || number,
    number,
  };
}

export async function listGroups(userId: string): Promise<WhatsAppGroupSummary[]> {
  const client = requireClient(userId);
  const chats = await client.getAllGroups();
  return chats
    .filter((chat) => chat.isGroup)
    .map((chat) => ({
      id: chat.id,
      name: chat.formattedTitle || chat.name || chat.id,
      participantCount: chat.groupMetadata?.participants?.length ?? 0,
    }));
}

export async function listGroupMembers(userId: string, groupId: string): Promise<WhatsAppContactSummary[]> {
  const client = requireClient(userId);
  const members = await client.getGroupMembers(groupId as GroupChatId);
  return members.map(toContactSummary).filter((c) => c.number);
}

export async function listContacts(userId: string): Promise<WhatsAppContactSummary[]> {
  const client = requireClient(userId);
  const contacts = await client.getAllContacts();
  return contacts
    .filter((c) => c.isMyContact && !c.isMe && typeof c.id === "string" && c.id.endsWith("@c.us"))
    .map(toContactSummary)
    .filter((c) => c.number);
}

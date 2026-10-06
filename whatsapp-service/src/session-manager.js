const { create, ev, STATE } = require("@open-wa/wa-automate");

/** @type {Map<string, { status: string, qr?: string, number?: string, client?: any, error?: string }>} */
const sessions = new Map();

// `ev` is shared across every open-wa session in this process; events are
// namespaced as `qr.<sessionId>` (sessionId = our userId).
ev.on("qr.**", (qrDataUrl, sessionId) => {
  const session = sessions.get(sessionId);
  if (session && session.status !== "connected") {
    session.qr = qrDataUrl;
    session.status = "qr";
  }
});

function toPublic(state) {
  return { status: state.status, qr: state.qr, number: state.number, error: state.error };
}

function getSession(userId) {
  const session = sessions.get(userId);
  return session ? toPublic(session) : { status: "disconnected" };
}

async function connectSession(userId) {
  const existing = sessions.get(userId);
  if (existing && existing.status !== "disconnected" && existing.status !== "error") {
    return toPublic(existing);
  }

  const state = { status: "connecting" };
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

async function disconnectSession(userId) {
  const session = sessions.get(userId);
  if (session && session.client) {
    try {
      await session.client.kill();
    } catch {
      // already dead — nothing to clean up
    }
  }
  sessions.delete(userId);
}

function requireClient(userId) {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected" || !session.client) {
    const err = new Error("WhatsApp non connecté.");
    err.statusCode = 409;
    throw err;
  }
  return session.client;
}

function toContactSummary(contact) {
  const number = typeof contact.id === "string" ? contact.id.split("@")[0] : "";
  return {
    id: contact.id,
    name: contact.name || contact.pushname || contact.formattedName || number,
    number,
  };
}

async function listGroups(userId) {
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

async function listGroupMembers(userId, groupId) {
  const client = requireClient(userId);
  const members = await client.getGroupMembers(groupId);
  return members.map(toContactSummary).filter((c) => c.number);
}

async function listContacts(userId) {
  const client = requireClient(userId);
  const contacts = await client.getAllContacts();
  return contacts
    .filter((c) => c.isMyContact && !c.isMe && typeof c.id === "string" && c.id.endsWith("@c.us"))
    .map(toContactSummary)
    .filter((c) => c.number);
}

module.exports = {
  getSession,
  connectSession,
  disconnectSession,
  listGroups,
  listGroupMembers,
  listContacts,
};

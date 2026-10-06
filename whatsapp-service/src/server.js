const express = require("express");
const cors = require("cors");
const {
  getSession,
  connectSession,
  disconnectSession,
  listGroups,
  listGroupMembers,
  listContacts,
} = require("./session-manager");

const app = express();
app.use(cors());
app.use(express.json());

const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (!SERVICE_API_KEY) {
    return res.status(500).json({ success: false, error: "SERVICE_API_KEY n'est pas configurée sur le service." });
  }
  if (req.header("x-service-key") !== SERVICE_API_KEY) {
    return res.status(401).json({ success: false, error: "Clé de service invalide." });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/sessions/:userId/connect", async (req, res) => {
  const state = await connectSession(req.params.userId);
  res.json({ success: true, ...state });
});

app.get("/sessions/:userId/status", (req, res) => {
  res.json({ success: true, ...getSession(req.params.userId) });
});

app.post("/sessions/:userId/disconnect", async (req, res) => {
  await disconnectSession(req.params.userId);
  res.json({ success: true });
});

app.get("/sessions/:userId/groups", async (req, res) => {
  try {
    const groups = await listGroups(req.params.userId);
    res.json({ success: true, groups });
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

app.get("/sessions/:userId/groups/:groupId/members", async (req, res) => {
  try {
    const members = await listGroupMembers(req.params.userId, decodeURIComponent(req.params.groupId));
    res.json({ success: true, members });
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

app.get("/sessions/:userId/contacts", async (req, res) => {
  try {
    const contacts = await listContacts(req.params.userId);
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Chapnet WhatsApp service listening on port ${port}`);
});

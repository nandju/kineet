# Chapnet WhatsApp service

Standalone service that hosts [open-wa](https://github.com/open-wa/wa-automate-nodejs) WhatsApp sessions (QR connect, groups, contacts). It runs as its own long-lived Node process because open-wa keeps a real browser session alive in memory — this cannot run on Vercel's serverless functions, which is why it's split out from the main Next.js app.

## Local run

```bash
cd whatsapp-service
npm install
SERVICE_API_KEY=dev-secret PORT=8080 npm start
```

## Deploy

Deploy the `whatsapp-service/` folder with its `Dockerfile` to any platform that runs a persistent container — Railway, Render, Fly.io, or a plain VPS all work the same way:

1. Point the platform at this folder (or build the Docker image from it) and deploy.
2. Set the `SERVICE_API_KEY` env var to a random secret (`openssl rand -hex 32`).
3. Note the public URL the platform gives you (e.g. `https://chapnet-whatsapp.up.railway.app`).

Then, on the main Next.js app (Vercel), set:
- `WHATSAPP_SERVICE_URL` = that public URL
- `WHATSAPP_SERVICE_API_KEY` = the same secret as `SERVICE_API_KEY` above

## Known limitation — session persistence

Session auth data (`*.data.json`) is written to the container's local filesystem. On most platforms that storage is wiped on redeploy/restart, meaning connected WhatsApp accounts will need to re-scan the QR code after a redeploy unless you attach a persistent volume mounted at the working directory (`/app`). This is fine for testing; revisit before relying on this for real users.

## API

All routes except `/health` require an `x-service-key` header matching `SERVICE_API_KEY`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/sessions/:userId/connect` | Start (or resume) a session; returns `{status, qr?}` |
| GET | `/sessions/:userId/status` | Poll current session state |
| POST | `/sessions/:userId/disconnect` | Log out and free the session |
| GET | `/sessions/:userId/groups` | List WhatsApp groups |
| GET | `/sessions/:userId/groups/:groupId/members` | List a group's members |
| GET | `/sessions/:userId/contacts` | List contacts |

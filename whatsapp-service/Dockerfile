# Base image already ships Chromium + every system library Puppeteer needs —
# avoids hand-listing 20+ apt packages for headless Chrome on Debian.
FROM ghcr.io/puppeteer/puppeteer:23.11.1

WORKDIR /app

# Chromium is already bundled in this image; skip Puppeteer's own download.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]

# Betrieb auf dem kiio-Server (Coolify) – parallel zu Netlify.
# Sicher im Parallelbetrieb: ohne SMTP_PASS keine Mails, ohne SCHEDULES=1 keine Erinnerungen/Digest,
# mit ASKME_URL=off keine Weitergabe von Fragen.
FROM node:22-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx --yes esbuild@0.24.0 netlify/functions/*.mjs --bundle --platform=node --format=esm --target=node22 \
      --outdir=/fn --packages=external --alias:@netlify/blobs=./kiio/blobs.mjs --out-extension:.js=.mjs
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DIST_DIR=/app/public SPA=0 BLOBS_DIR=/data/blobs NETLIFY_TOML=/app/netlify.toml TZ=Europe/Berlin
COPY --from=build /src/package.json ./
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/public ./public
COPY --from=build /src/netlify.toml ./netlify.toml
COPY --from=build /fn ./fn
COPY kiio/server.mjs ./server.mjs
RUN mkdir -p /data/blobs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.mjs"]

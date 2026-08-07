# syntax=docker/dockerfile:1.7

# Build multi-tahap. Citra akhir hanya memuat keluaran `standalone` Next.js —
# server minimal beserta HANYA modul yang benar-benar dijangkau jejak impornya,
# bukan seluruh node_modules.
# `package-lock.json` ditulis npm 11; npm 10.9.8 yang dibundel node:22-alpine
# tidak dapat merekonsiliasinya. Yang dipin adalah perkakasnya, bukan
# dependensinya — lihat catatan yang sama di Dockerfile backend.
FROM node:22-alpine AS base
RUN npm install -g npm@11.13.0
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js memanggang variabel `NEXT_PUBLIC_*` ke dalam bundel klien saat build,
# bukan saat jalan. Nilainya karena itu harus ada di sini, dan mengubahnya
# menuntut build ulang — bukan sekadar restart.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Keluaran `standalone` sudah memuat node_modules yang dipangkas; `npm ci` kedua
# di sini hanya akan menambah ratusan megabita yang tidak pernah dimuat.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3100

STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/masuk').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

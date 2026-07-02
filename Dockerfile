# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependências ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
# NEXT_PUBLIC_* são embutidas no bundle do cliente em build-time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# Valor sintético: nenhuma conexão é aberta durante o build (exigido pelo
# construtor do PrismaClient em src/server/db.ts).
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    DATABASE_URL=$DATABASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0
USER node
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]

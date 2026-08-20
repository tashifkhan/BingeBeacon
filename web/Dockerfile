# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------
# BingeBeacon PWA — TanStack Start (Vite + Nitro "bun" preset)
#
# VITE_* values are baked into the client bundle at BUILD time, so they are
# ARGs here, not runtime env. Rebuild the image after changing any of them.
# ---------------------------------------------------------------

FROM oven/bun:1.3-alpine AS base
WORKDIR /app
ENV CI=1

# ---------- dependencies ----------
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---------- build ----------
FROM base AS builder

ARG VITE_API_URL=http://localhost:8080/api/v1
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_STORAGE_BUCKET=
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=
ARG VITE_FIREBASE_APP_ID=
ARG VITE_FIREBASE_VAPID_KEY=

ENV NODE_ENV=production \
    VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---------- runtime ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Nitro's bun preset emits a self-contained bundle in .output, including the
# handful of externals it keeps under .output/server/node_modules.
COPY --from=builder --chown=bun:bun /app/.output ./.output

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

CMD ["bun", "run", ".output/server/index.mjs"]

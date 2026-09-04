FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat

# Opt out of Medusa's anonymous analytics. Set in the builder too so the
# postinstall notice and `medusa build` do not emit events.
ENV MEDUSA_DISABLE_TELEMETRY=true

COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY medusa-config.ts ./
COPY src ./src

RUN npm ci --no-audit --no-fund

RUN npx medusa build

# medusa build copies package.json + package-lock.json into .medusa/server,
# so the runtime install is lockfile-pinned too.
RUN cd /app/.medusa/server && npm ci --omit=dev --no-audit --no-fund && npm cache clean --force


FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache tini libc6-compat curl

COPY --from=builder /app/.medusa/server /app/.medusa/server
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh \
    && mkdir -p /app/.medusa/server/static

ENV NODE_ENV=production
ENV PORT=9000

# Telemetry off, two independent mechanisms:
#   1. MEDUSA_DISABLE_TELEMETRY short-circuits store.addEvent(), so no event is
#      ever recorded. This holds even if HOME is read-only or the container runs
#      as a different user.
#   2. `medusa telemetry --disable` writes telemetry.enabled=false to
#      $HOME/.config/medusa/config.json. isTrackingEnabled() reads only that
#      file, so this is what suppresses the opt-out banner and stops the
#      send.js flush subprocess from being forked at all.
ENV MEDUSA_DISABLE_TELEMETRY=true
RUN cd /app/.medusa/server && npx medusa telemetry --disable

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-9000}/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]

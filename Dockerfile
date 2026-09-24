# Production image for Coolify (or any Docker host). Vercel ignores this file.
#
# pnpm workspace: the app is the root package; packages/client is a separate
# published client library the app does not import, so only its manifest is
# needed for `pnpm install --frozen-lockfile`.

FROM node:22-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/client/package.json packages/client/package.json
RUN pnpm install --frozen-lockfile
COPY . .
# lib/config.ts parses APPS at module load and throws when it is empty, and
# `next build` imports route modules while collecting page data. Give the build
# a syntactically valid placeholder. It exists only in this build stage — the
# runtime stage below never sees it, and the real APPS comes from Coolify env.
RUN APPS='{"build-placeholder-key":{"appId":"build","from":"build@example.com","fromName":"Build","templates":["welcome"]}}' \
    EMAIL_PROVIDER=console \
    pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next's standalone server binds to localhost unless told otherwise.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
# /api/health touches no database or external service.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]

# Container image for mail-service — App Runner, ECS, Fly, or anywhere that runs Docker.
#
# No secrets are needed to build it. APPS, the AWS credentials (or an IAM role)
# and the Redis/webhook settings are all supplied at runtime.

FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY . .
RUN pnpm install --frozen-lockfile
# Standalone output is opt-in (see next.config.mjs); the image needs it.
ENV NEXT_OUTPUT=standalone
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]

# Blocks Release build: a static export of the site, served by nginx on port 8080
# (the same shape as the `blocks new web` template). Release passes `ci_build=<environment>`.

FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# The whole repo first: the postinstall script (scripts/copy-decoders.mjs) needs scripts/ and public/.
COPY . .

RUN pnpm install --frozen-lockfile

ARG ci_build=dev
ENV NEXT_OUTPUT=export
ENV NEXT_TELEMETRY_DISABLED=1

RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY --from=builder /app/out /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD wget -qO- http://localhost:8080/ || exit 1

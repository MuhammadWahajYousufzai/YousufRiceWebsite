FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/mcp-server/ ./apps/mcp-server/
COPY tsconfig.base.json ./

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @yousuf-rice/mcp-server build

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

COPY --from=builder /app/apps/mcp-server/dist ./dist
COPY --from=builder /app/apps/mcp-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER mcp

ENV NODE_ENV=production

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

CMD ["node", "dist/server.js"]

# Stage 1: Build application artifacts
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies and generate Prisma client
RUN npm ci

# Copy application source code and build configs
COPY . .

# Build Vite SPA frontend and Node Express CJS server bundle
RUN npm run build

# Stage 2: Production runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy runtime assets, Prisma client, and dependencies from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000

# Native Node.js health check (Node 22 includes global fetch)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.cjs"]

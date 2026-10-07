# =========================================================================
# Multi-stage Dockerfile for iPLS (Plano de Logística Sustentável - SJRR)
# Production-ready, secure, lightweight (Alpine Linux), and non-root execution
# =========================================================================

# Stage 1: Dependencies Cache
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies required by node-gyp if necessary
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* bun.lock* ./
RUN npm ci

# -------------------------------------------------------------------------
# Stage 2: Application Build
# -------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run type check and Vite client bundle
RUN npm run lint
RUN npm run build

# -------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# -------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user and persistent data directories
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 iplsuser

# Prepare app directories with proper permissions
RUN mkdir -p /app/data && chown -R iplsuser:nodejs /app

# Copy production dependencies and built assets
COPY --from=deps --chown=iplsuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=iplsuser:nodejs /app/dist ./dist
COPY --from=builder --chown=iplsuser:nodejs /app/public ./public
COPY --from=builder --chown=iplsuser:nodejs /app/data ./data
COPY --from=builder --chown=iplsuser:nodejs /app/src ./src
COPY --from=builder --chown=iplsuser:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=iplsuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=iplsuser:nodejs /app/tsconfig.json ./tsconfig.json

# Declare data volume for persistent audit logs, measurements, and indicators
VOLUME ["/app/data"]

# Switch to non-root user
USER iplsuser

# Expose HTTP port
EXPOSE 3000

# Native health check against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start full-stack server
CMD ["npx", "tsx", "server.ts"]

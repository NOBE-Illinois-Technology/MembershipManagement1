# syntax=docker/dockerfile:1

################################################################################
# Stage 1: Base image
################################################################################
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl git openssh-client && \
    git config --system --add safe.directory '*'

################################################################################
# Stage 2: Install dependencies
################################################################################
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

################################################################################
# Stage 3: Development environment (for local development with hot-reloading)
################################################################################
FROM base AS development
ENV PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["sleep", "infinity"]

################################################################################
# Stage 4: Production builder
################################################################################
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

################################################################################
# Stage 5: Production runner
################################################################################
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]

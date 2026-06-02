# Syntax: docker/dockerfile:1

# Stage 1: Base image
FROM node:18-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry is disabled during build
ENV NEXT_TELEMETRY_DISABLED 1

# Note: In a real CI/CD pipeline, you would pass the environment variables here if they are required at build time.
# Since we are using Next.js standalone mode and runtime variables (where possible), we run a standard build.
RUN npm run build

# Stage 4: Production server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user to run the app securely
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json untuk menginstal prisma CLI secara lokal (agar ukuran image tetap terjaga)
COPY package.json ./
RUN npm install prisma --no-save

# Copy skema database untuk keperluan sinkronisasi
COPY prisma ./prisma
# Pastikan user nextjs memiliki hak akses ke folder prisma
RUN chown -R nextjs:nodejs ./prisma

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# [AUTO-MIGRATE] Jalankan sinkronisasi database lalu mulai server.
# --skip-generate digunakan agar tidak terjadi error permission saat mencoba membuat ulang Prisma Client.
CMD npx prisma db push --skip-generate && node server.js

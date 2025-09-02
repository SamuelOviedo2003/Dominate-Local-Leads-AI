# syntax=docker/dockerfile:1

# Define build arguments for Node.js and Alpine versions
ARG NODE_VERSION=20.18.0
ARG ALPINE_VERSION=3.20

# =========================================
# Stage 1: Base Image with Common Dependencies
# =========================================
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

# Install security updates and required system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set environment variables for Node.js production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# =========================================
# Stage 2: Dependencies Installation
# =========================================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install dependencies with cache mount for performance
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && \
    npm cache clean --force

# =========================================
# Stage 3: Build Stage
# =========================================
FROM base AS builder

# Override NODE_ENV to ensure devDependencies are installed
ENV NODE_ENV=development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build arguments for environment variables (if needed at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set build-time environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set NODE_ENV back to production for the build
ENV NODE_ENV=production

# Build the application with standalone output
RUN npm run build

# =========================================
# Stage 4: Production Runtime
# =========================================
FROM base AS runner

# Set user for security
USER nextjs

# Copy standalone application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public assets from standalone build (includes post-build script output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Runtime environment variables (can be overridden at container runtime)
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
# Discord Bot Dockerfile
# This Dockerfile is specifically for running the Discord bot service
# Deploy this separately from the Next.js application

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (including dev dependencies for tsx)
RUN pnpm install

# Copy source code
COPY index.ts ./
COPY notifications.ts ./
COPY start.ts ./
COPY clear-and-register-commands.ts ./
COPY tsconfig.json ./

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies and source
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/index.ts ./
COPY --from=base /app/notifications.ts ./
COPY --from=base /app/start.ts ./
COPY --from=base /app/clear-and-register-commands.ts ./
COPY --from=base /app/tsconfig.json ./

# Set environment to production
ENV NODE_ENV=production

# Expose port (not needed for Discord bot, but useful for health checks)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Run the Discord bot
CMD ["pnpm", "exec", "tsx", "start.ts"]

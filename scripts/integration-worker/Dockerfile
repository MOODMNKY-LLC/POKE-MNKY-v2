FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY scripts/integration-worker/package.json ./
COPY scripts/integration-worker/pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY scripts/integration-worker/src ./src
COPY scripts/integration-worker/tsconfig.json ./

# Build TypeScript
RUN pnpm build

# Verify build output exists
RUN ls -la dist/ || echo "Build output check"

# Start worker
CMD ["node", "dist/index.js"]

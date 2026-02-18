FROM node:20-alpine

WORKDIR /app

# Copy root workspace config + package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma client & build TypeScript
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

# Production
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "timeout 15 npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma 2>&1 || echo 'Migration skipped'; node apps/api/dist/index.js"]

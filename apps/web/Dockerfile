FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install --workspace=apps/web --workspace=packages/shared --include-workspace-root

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=apps/web"]

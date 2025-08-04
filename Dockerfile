# 🎯 Build stage
FROM node:20.13.1-bookworm-slim AS builder
WORKDIR /usr/src/app

# Leverage Docker cache
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# 🧪 Runtime stage
FROM node:20.13.1-bookworm-slim
WORKDIR /usr/src/app

# Update OS packages first
RUN apt-get update \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Optional: use non-root user for security
USER node

CMD ["node", "dist/index.js"]

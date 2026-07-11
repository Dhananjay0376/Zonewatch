# Production Dockerfile for Zonewatch

# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Run typescript compile check and build bundle
RUN npx tsc --noEmit && npm run build

# --- Production Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy dist files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server

EXPOSE 3000

CMD ["node", "dist/server.cjs"]

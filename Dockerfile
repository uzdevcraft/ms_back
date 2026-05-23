# Production image (optional: CI smoke tests). Droplet deploy uses PM2 + Node directly, not this container.
# Managed PostgreSQL is external — pass DATABASE_URL at runtime only.

FROM node:20-alpine AS base
RUN apk add --no-cache openssl \
  && addgroup -g 1001 nodejs \
  && adduser -u 1001 -G nodejs -D appuser
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
USER appuser
COPY --chown=appuser:nodejs package.json package-lock.json ./
COPY --chown=appuser:nodejs --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:nodejs --from=build /app/dist ./dist
COPY --chown=appuser:nodejs --from=build /app/prisma ./prisma
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]

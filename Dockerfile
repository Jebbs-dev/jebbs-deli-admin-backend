# Production image for Railway (and local: docker build -t jebbs-api .)
# Secrets (JWT, Cloudinary, Paystack, etc.) must come from Railway at runtime only —
# not as Docker ARG/ENV, so they are not baked into image layers.

FROM node:22-alpine AS base
RUN npm install -g pnpm@11.5.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prisma reads DATABASE_URL during `prisma generate` (postinstall); no DB connection at build.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 8080
CMD ["node", "dist/src/main.js"]

# Jebbs Deli API

NestJS API for the Jebbs Deli customer and admin apps. PostgreSQL via Prisma; Paystack for charges and transfers.

## Prerequisites

- Node.js 22+
- pnpm 11+
- PostgreSQL

## Local setup

```bash
pnpm install
cp .env.example .env
# fill DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, PAYSTACK_SECRET_KEY
pnpm prisma:migrate    # local only — creates/applies migrations with Prisma Migrate Dev
pnpm dev
```

API listens on `http://localhost:8080` (`PORT`). HTTP routes are prefixed with `/api`. Health: `GET /api/health`. OpenAPI: `/docs`.

## Migrations

| Environment | Command | Why |
| --- | --- | --- |
| Local development | `pnpm prisma:migrate` (`prisma migrate dev`) | Expands the schema and writes migration files. Never point this at Railway/production. |
| Production / Railway | `pnpm prisma:deploy` (`prisma migrate deploy`) | Applies already-committed migrations. This is the deploy path. |

`prisma migrate reset` drops data. Do not run it against shared or production databases.

## Production boot checks

The process refuses to start without `DATABASE_URL`. In `NODE_ENV=production` it also requires `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `PAYSTACK_SECRET_KEY`.

## Scripts

- `pnpm dev` — compile and run the API with watch
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest unit tests
- `pnpm prisma:deploy` — apply migrations in production
- `pnpm prisma:status` — migration status

## Auth

Login is always a **User**. A **Store** is an outlet (catalog, address, kitchen), never an account. `Store.email` / `Store.telephone` are contact fields. `Store.userId` is currently unique because each vendor user owns one outlet — that is ownership, not “log in as the store.”

Browser clients send httpOnly `access_token` / `refresh_token` cookies and a readable `csrf_token` cookie on mutating requests (`X-CSRF-Token`). Swagger documents both bearer and cookie auth.

Canonical catalog URLs are nested under `/api/v1/stores/:storeId`. Older inverted paths (`/api/products/store/:storeId`, `/api/store`) remain as aliases for one release. `GET /api/v1/auth/me` omits payout secrets; use `GET /api/v1/stores/:id/manage` for bank fields.


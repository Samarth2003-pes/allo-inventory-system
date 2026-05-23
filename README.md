# Allo Inventory Reservation System

A Next.js inventory reservation system built for the Allo Engineering take-home exercise.

## Live URL

[Add your Vercel URL here after deployment]

---

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript** end-to-end
- **Prisma + Neon** (hosted PostgreSQL)
- **Zod** (request validation)
- **Tailwind CSS** (styling)
- **Vercel Cron** (reservation expiry)

---

## Running Locally

### 1. Clone and install

```bash
git clone 
cd allo-inventory
npm install
```

### 2. Environment variables

Create a `.env` file in the root of the project:
DATABASE_URL="your_neon_postgresql_connection_string"
CRON_SECRET="any_random_string_you_choose"

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Seed the database

```bash
npx tsx prisma/seed.ts
```

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## How Concurrency Safety Works

This is the core of the exercise. The race condition is:

Two requests arrive simultaneously for the last unit. Both read "1 available". Both pass the stock check. Both succeed. One unit is oversold.

### Solution: PostgreSQL row-level locking with SELECT FOR UPDATE

Inside every reservation creation, I open a Prisma transaction and immediately lock the inventory row:

```sql
SELECT id, "totalStock", "reservedStock"
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

FOR UPDATE tells PostgreSQL to acquire an exclusive lock on that row. The second concurrent transaction blocks at this line until the first transaction commits or rolls back. By the time it unblocks, the first transaction has already incremented reservedStock, so the second sees insufficient stock and returns 409.

This guarantees that exactly one of two simultaneous requests for the last unit succeeds — no Redis required, no application-level locking needed. PostgreSQL handles it correctly at the database level.

The same SELECT FOR UPDATE pattern is used in the confirm and release endpoints to prevent double-processing of the same reservation.

---

## How Reservation Expiry Works

Two complementary approaches are used together:

### 1. Lazy cleanup on every product listing request

When GET /api/products is called, it first scans for any PENDING reservations that have passed their expiresAt timestamp and releases them inside a transaction. This means stock levels are always accurate by the time a user sees the product listing page. No background worker is needed for correctness.

### 2. Vercel Cron Job running every minute

vercel.json schedules GET /api/cron/expire to run every minute in production. This actively catches reservations that expire when nobody happens to be visiting the products page. The endpoint is protected by a CRON_SECRET environment variable that Vercel sends as a Bearer token so random people cannot call it.

Together these two approaches ensure reserved stock is never locked indefinitely, even if no user visits the site for a long time.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List all products with available stock per warehouse |
| GET | /api/warehouses | List all warehouses |
| POST | /api/reservations | Reserve units — returns 409 if insufficient stock |
| GET | /api/reservations/:id | Get reservation details including product and warehouse |
| POST | /api/reservations/:id/confirm | Confirm reservation — returns 410 if expired |
| POST | /api/reservations/:id/release | Release reservation early |
| GET | /api/cron/expire | Internal — releases all expired reservations (cron only) |

---

## Database Design

### Product
Stores product name and description.

### Warehouse
Stores warehouse name and location.

### Inventory
Tracks stock per product per warehouse with two fields:
- totalStock — total physical units
- reservedStock — units currently on hold

Available stock is always calculated as totalStock minus reservedStock. This avoids any possibility of negative stock and makes the concurrency check straightforward.

### Reservation
Tracks each reservation with:
- productId and warehouseId — which item and where
- quantity — how many units are held
- status — PENDING, CONFIRMED, or RELEASED
- expiresAt — when the hold automatically expires

---

## Trade-offs and What I Would Do Differently

### What I chose and why

**PostgreSQL SELECT FOR UPDATE over Redis distributed locking**

For a single Postgres instance, row-level locking is simpler, more reliable, and has fewer moving parts than Redis distributed locks. Redlock adds complexity and introduces a second failure point. If the system were multi-region with multiple primary databases, Redis would make more sense as a coordination layer.

**Lazy cleanup plus cron over a persistent background worker**

Vercel is serverless so long-running background workers are not possible. The cron job plus lazy cleanup on read achieves the same correctness guarantee without needing any additional infrastructure beyond what Vercel provides for free.

**No authentication**

Kept out of scope to focus on the inventory reservation logic. In production, reservations would be tied to a user session or order ID so users can only manage their own reservations.

### With more time I would add

**Idempotency keys on reserve and confirm**

If a client sends a request and the network drops before receiving the response, it cannot safely retry because it might create a duplicate reservation. The fix is an Idempotency-Key header: on first request, process normally and store the response in Redis with a 24-hour TTL. On retry with the same key, return the cached response immediately without repeating the side effect. This is standard practice for payment and reservation APIs.

**Concurrency integration tests**

A test that fires two simultaneous requests for the last unit of a product and asserts exactly one 201 and one 409 response. This would prove the SELECT FOR UPDATE locking works correctly under real concurrent load.

**Real payment flow simulation**

The confirm endpoint currently just flips the reservation status. A real integration would call a payment provider, and only confirm the reservation if payment succeeds. If payment fails, the reservation would be released automatically.

**Optimistic UI stock updates**

After a failed reservation attempt due to insufficient stock, the product listing should refresh immediately to show the real available count without requiring a manual page reload.
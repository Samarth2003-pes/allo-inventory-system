# Allo Inventory Reservation System

A Next.js inventory reservation system built for the Allo Health Software Engineering Intern take-home assignment.

## Features

- Product inventory management
- Multi-warehouse stock tracking
- Reservation-based inventory locking
- Reservation confirmation and release flow
- Reservation expiry handling
- Concurrency-safe reservation logic
- Frontend checkout flow with countdown timer

---

# Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- Neon PostgreSQL
- Tailwind CSS
- Zod Validation

---

# API Endpoints

## Products

GET /api/products

Returns all products with warehouse inventory.

---

## Reservations

POST /api/reservations

Creates a reservation if stock is available.

Returns:
- 200 on success
- 409 if stock unavailable

---

## Confirm Reservation

POST /api/reservations/:id/confirm

Confirms reservation and permanently deducts stock.

Returns:
- 200 on success
- 410 if reservation expired

---

## Release Reservation

POST /api/reservations/:id/release

Releases reserved stock back to inventory.

---

# Database Design

## Product
Stores product details.

## Warehouse
Stores warehouse information.

## Inventory
Tracks:
- total stock
- reserved stock
- available stock

per product per warehouse.

## Reservation
Tracks:
- reservation status
- quantity
- expiry time

Statuses:
- PENDING
- CONFIRMED
- RELEASED

---

# Concurrency Handling

Concurrency was handled using Prisma transactions to ensure that two simultaneous reservation requests cannot reserve the same stock unit.

The reservation logic:
1. Checks available stock
2. Updates reserved stock atomically
3. Creates reservation within the same transaction

This prevents overselling during concurrent requests.

---

# Reservation Expiry

Reservations include an expiresAt timestamp.

Expired reservations are validated during confirmation requests and are rejected if expired.

---

# Running Locally

## Install dependencies

npm install

---

## Configure Environment Variables

Create a .env file:

DATABASE_URL="your_neon_database_url"

---

## Run Prisma Migration

npx prisma migrate dev

---

## Seed Database

npx tsx prisma/seed.ts

---

## Start Development Server

npm run dev

---

# Deployment

The application can be deployed using:
- Vercel for frontend/backend hosting
- Neon for PostgreSQL hosting

---

# Trade-offs

- UI was kept intentionally simple to focus on backend correctness and reservation consistency.
- Reservation expiry cleanup is handled during validation rather than a dedicated cron worker.
- Authentication and payment integration were not included to keep focus on inventory reservation logic.

---

# Future Improvements

- Add Redis distributed locking
- Add idempotency support
- Background cleanup worker
- Real-time inventory updates
- Authentication and user sessions
# Archiverse

Archiverse is a React + Vite storefront with Supabase-backed catalog and order management, Razorpay checkout, admin controls, and a Vercel-friendly backend verification layer.

## Environment

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`

Backend:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Optional notifications:

- `ADMIN_NOTIFICATION_WEBHOOK_URL`
- `ADMIN_NOTIFICATION_EMAIL`
- `RESEND_API_KEY`
- `FROM_EMAIL`

## Database migration

Apply the production hardening migration before deploying the new checkout flow:

- [supabase/migrations/20260420_archiverse_order_hardening.sql](/Users/captainani/Documents/Archiverse/supabase/migrations/20260420_archiverse_order_hardening.sql)

This migration adds:

- readable `order_code` values
- unique payment ID protection
- payment/order constraints
- artwork and order validation checks
- immutable order field protection

## Backend routes

Serverless routes live in `/api`:

- `POST /api/payment-order` creates a Razorpay order from the canonical artwork price
- `POST /api/verify-payment` verifies signature and payment status
- `POST /api/orders` creates the verified order in Supabase
- `GET /api/orders?payment_id=...` recovers orders after client/network interruptions

## Runbook

1. Configure frontend and backend environment variables.
2. Apply the Supabase migration.
3. Deploy to Vercel so the `/api` routes run server-side.
4. Confirm that successful checkout creates an order with a readable order code.
5. Optionally configure webhook or Resend email notifications.

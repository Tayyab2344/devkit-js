# ARCHITECTURE.md — Multi-Vendor E-Commerce Platform

## 1. Roles

| Role | Scope |
|---|---|
| Super Admin | Platform-wide: approves companies, global coupons, all analytics/payouts. |
| Company | Owns a storefront (`/store/:slug`). Own products, orders, staff, coupons. |
| User | Buys across companies in one cart. Redeems coupons/discount links. |

## 2. Stack

- **Backend:** FastAPI, SQLModel/SQLAlchemy 2.0, Alembic, Pydantic v2, pytest, Redis,
  Celery/arq for jobs.
- **Frontend:** Next.js (App Router), TypeScript.
- **DB:** PostgreSQL.
- **Auth:** JWT (access + refresh); claims include `user_id`, `role`, `company_id`
  (null for non-company users).

## 3. Core Entities (initial schema sketch)

```
User          id, email, password_hash, role, created_at
Company       id, owner_id(User), name, slug, status(pending|active|suspended), commission_rate
Product       id, company_id, title, price_cents, stock, status
Order         id, user_id, status, total_cents, created_at
OrderItem     id, order_id, company_id, product_id, qty, unit_price_cents, discount_cents
Coupon        id, code, scope(platform|company), company_id(nullable), type(flat|percent),
              value, min_order_cents, usage_limit, used_count, expires_at, active
DiscountLink  id, coupon_id, slug, clicks, conversions, created_at
Payout        id, company_id, amount_cents, status, period_start, period_end
```

`OrderItem.company_id` is denormalized deliberately — one order can span multiple
companies; payouts/reporting are computed per company from line items.
`Coupon.scope = platform` (company_id null) means the platform funds the discount, not
the vendor — this must be explicit, never inferred.

## 4. Request Flow — Checkout with a Coupon

1. User's cart can hold products from multiple companies.
2. User applies a coupon code, or arrives via `/r/{slug}` which resolves a
   `DiscountLink` → `Coupon` and stores it in session.
3. On checkout, the **FastAPI checkout service** — not the client — re-validates:
   active, not expired, under usage limit, correct scope for the cart's companies,
   minimum order value met.
4. Totals are computed per company (for payout splitting) and overall, inside one DB
   transaction (order + order_items + coupon.used_count increment, atomic).

## 5. Discount Links vs Coupons

A `DiscountLink` is a shareable URL (`/r/{slug}`) that auto-applies an underlying
`Coupon` and redirects into the storefront/product page. Keep discount logic in one
place (`Coupon`); the link just adds click/conversion tracking on top.

## 6. Multi-Tenancy & Authorization (FastAPI specifics)

- `get_current_user` dependency decodes the JWT.
- `require_role(*roles)` dependency factory for role checks.
- `get_company_scope` dependency resolves the effective `company_id` for the request
  and every repository/service call takes it as a required parameter — no service
  function silently queries "all companies."
- Super Admin bypasses scope checks; every bypass is logged for audit/support.

## 7. Payouts (high-level)

Scheduled job (Celery beat / arq cron, weekly) aggregates `OrderItem`s per company for
the period, subtracts `commission_rate` and platform-funded coupon costs, creates a
`Payout` row (`pending`). Actual money movement (payment gateway payout API) is a
separate step: `pending → processing → paid → failed`.

## 8. Open Decisions (resolve before building checkout/coupons)

- [ ] Can coupons stack, or one per order?
- [ ] Does a company go live immediately on signup, or does Super Admin approve first?
- [ ] Who funds a platform-wide coupon — platform absorbs it, or deducted
      proportionally from company payouts?
- [ ] Payment gateway — Stripe Connect fits this multi-vendor payout model well if
      you need split payouts.

## 9. Integrations

| Integration | Purpose | Owner |
|---|---|---|
| (TBD) Payment gateway | Checkout + vendor payouts | DevOps |
| (TBD) Email provider | Order/coupon notifications | DevOps |
| Redis | Caching, job queue (payouts, coupon-expiry sweep) | Backend Architect |

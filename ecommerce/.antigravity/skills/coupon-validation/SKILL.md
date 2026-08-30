---
name: coupon-validation
description: Use whenever implementing or modifying checkout, coupon application, or discount-link logic. Ensures coupons are always validated server-side and edge cases aren't skipped.
---

# Coupon & Discount Link Validation

## When this applies
Any code path where a coupon code or discount link affects an order total: checkout
service, cart preview endpoint, discount-link resolver.

## Required validation steps (server-side, always, in this order)
1. **Exists & active** — coupon row exists and `active = true`.
2. **Not expired** — `expires_at` is null or in the future.
3. **Usage limit** — `used_count < usage_limit` (if `usage_limit` is set).
4. **Scope match** — if `scope = company`, the coupon only discounts line items whose
   `company_id` matches the coupon's `company_id`; it must not discount other
   companies' items in the same cart.
5. **Minimum order value** — cart (or the relevant company's subtotal, if scoped) meets
   `min_order_cents`.
6. **Stacking rule** — check the project's explicit stacking decision (see
   ARCHITECTURE.md open decisions). If undecided, treat as "one coupon per order" and
   flag it for the user to confirm — do not silently allow stacking.

## Never do this
- Never accept a discount amount computed by the client and apply it as-is.
- Never increment `used_count` outside the same DB transaction as order creation
  (a failed order must not consume the coupon).
- Never apply a company-scoped coupon to another company's line items, even partially.

## Discount links
A `DiscountLink` only resolves to a `Coupon` and applies the same validation above —
it is not a separate discount path with its own rules. Track `clicks` on every
resolve, `conversions` only when the linked coupon is actually used on a completed
order.

## Test cases this skill implies (hand off to QA persona)
- Expired coupon → rejected.
- Usage limit reached → rejected.
- Company-scoped coupon applied to a different company's product → rejected.
- Order total below `min_order_cents` → rejected.
- Two coupons on one order → behavior matches the project's explicit stacking
  decision.

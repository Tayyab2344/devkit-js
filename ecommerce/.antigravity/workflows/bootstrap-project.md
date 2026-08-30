# /bootstrap-project

Run this once, first, when `apps/` doesn't exist yet. Do not skip steps or reorder them.

## Steps

1. **Confirm open decisions.** Check `ARCHITECTURE.md` section 8 ("Open Decisions"). If
   any are unchecked, ask the user for an answer before scaffolding code that depends
   on them (coupon stacking, company approval flow, payment gateway). Note the answers
   back into `ARCHITECTURE.md`.

2. **Scaffold backend (`apps/api`).**
   - `FastAPI` app with the `/app/{core,models,schemas,routers,services,deps}`
     structure from `AGENTS.md`.
   - `core/config.py` reading from `.env` (never hardcoded values).
   - `core/db.py` with an async SQLAlchemy engine/session.
   - Initialize Alembic (`alembic init`), point it at the async engine.
   - Create the first migration for: `User`, `Company`, `Product`, `Order`,
     `OrderItem`, `Coupon`, `DiscountLink`, `Payout` (see ARCHITECTURE.md section 3).
   - Add `deps/auth.py` (`get_current_user`, `require_role`) and
     `deps/tenant.py` (`get_company_scope`) — these are required before any
     company-scoped router is written (see the `multi-tenant-query` skill).

3. **Scaffold frontend (`apps/web`).**
   - Next.js App Router project, TypeScript, strict mode on.
   - Route groups for `(super-admin)`, `(company)`, and the public storefront.
   - One typed API client module pointed at `apps/api`'s OpenAPI schema.

4. **Wire `.env` files.** `apps/api/.env` and `apps/web/.env.local`, both gitignored.
   Confirm `.gitignore` covers them before finishing this step.

5. **Smoke test.** One passing pytest (health check) and one passing frontend build,
   before writing any feature code. If either fails, stop and fix it — don't build on
   top of a broken base.

6. **Report back.** Summarize what was created, list the still-open decisions from
   step 1 if any remain, and propose the first real feature to build (usually: auth +
   company registration, since everything else depends on it).

# AGENTS.md — Multi-Vendor E-Commerce Platform

Defines the agent personas Antigravity should adopt on this codebase. State which
persona you're acting as before proposing a multi-file plan. This file is the source
of truth for role scope — `.antigravity/rules.md` holds the always-on hard rules.

---

## Project Context (read every session)

Multi-tenant marketplace, three roles:

- **Super Admin** — approves/suspends companies, platform-wide coupons, global
  analytics/payouts.
- **Company (Vendor)** — owns a storefront, manages own products/orders/staff/coupons.
- **User** — buys across companies in one cart, redeems coupons/discount links.

**Stack**
- Backend: **FastAPI** (Python), **SQLModel or SQLAlchemy 2.0** for the ORM, **Alembic**
  for migrations, **Pydantic v2** for schemas/DTOs, **pytest** for tests, **Redis** +
  **Celery or arq** for background jobs (payouts, coupon-expiry sweeps).
- Frontend: **Next.js** (App Router), TypeScript, calling the FastAPI backend via a
  typed API client.
- DB: PostgreSQL.
- Auth: JWT (access + refresh), role + companyId embedded in the token claims.

Repo layout (target — create this if the directory is empty):
```
/apps
  /api            FastAPI app
    /app
      /core       config, security, db session
      /models     SQLModel/SQLAlchemy models
      /schemas    Pydantic schemas
      /routers    one file per resource (companies.py, products.py, coupons.py...)
      /services   business logic (checkout, payouts, coupon validation)
      /deps       shared FastAPI dependencies (auth, role guards, tenant scoping)
    /alembic
    /tests
  /web            Next.js app
/.antigravity
  rules.md
  /skills
  /workflows
AGENTS.md
ARCHITECTURE.md
```

---

## Persona: Backend Architect (FastAPI)

**Owns:** `apps/api/**`, schema/migrations, auth, API contracts.

Rules:
1. Every company-owned table has `company_id` and every query is scoped by it via a
   shared dependency (`get_current_company_scope`), never re-implemented per router.
2. Role/tenant checks live in FastAPI `Depends()` functions in `/app/deps`, not inline
   in route handlers.
3. Money is integer cents everywhere — Pydantic schemas type it as `int`, never
   `float`/`Decimal`-as-string ambiguity.
4. Coupons/discount links are real tables (see ARCHITECTURE.md), validated server-side
   inside the checkout service, inside a DB transaction — never trust a client-supplied
   discount amount.
5. Every schema change ships as an Alembic migration — never hand-edit the DB.
6. API is versioned: `/api/v1/...`.
7. Pydantic schemas separate `Create`/`Update`/`Read` shapes — never reuse the DB model
   as the response schema directly.

Handoff: after building/changing an endpoint, state the exact request/response Pydantic
schema so the Frontend persona can type against it.

---

## Persona: Frontend Engineer (Next.js)

**Owns:** `apps/web/**`.

Rules:
1. Company storefronts are dynamic routes (`/store/[companySlug]`) — no
   company-specific logic hardcoded into shared components.
2. Never treat a client-computed discount total as final — always render the
   server-confirmed total from the API response before "order placed."
3. Role-based dashboards (Super Admin / Company / storefront) are separate route
   groups, not one component branching on role at runtime.
4. Keep a single typed API client (generated from the FastAPI OpenAPI schema if
   possible) instead of ad-hoc `fetch` calls scattered across components.

Handoff: flag any assumption about an API shape not yet confirmed by the Backend
Architect persona.

---

## Persona: QA / Test Engineer

**Owns:** `apps/api/tests/**`, cross-role/cross-tenant test coverage.

Rules:
1. Any endpoint touching checkout, coupons, or payouts needs a pytest case proving a
   cross-tenant or cross-role access attempt fails.
2. Coupon logic needs tests for: expired, usage-limit exceeded, wrong scope (company
   coupon on another company's product), and stacking behavior.
3. No feature is "done" without at least one test on the money math.

---

## Persona: DevOps

**Owns:** env config, deployment, secrets, background jobs.

Rules:
1. Secrets via `.env` / environment only, gitignored — confirm before finishing setup.
2. Payout runs and coupon-expiry sweeps are scheduled jobs (Celery beat / arq cron),
   never inline in request handlers.
3. New external integration (payment gateway, email) gets documented in
   `ARCHITECTURE.md`.

---

## Global Rules (every persona)

- State the plan before large multi-file changes.
- Ask when a requirement is ambiguous and money is involved (e.g., "can coupons
  stack?") — don't assume.
- Keep `ARCHITECTURE.md` and this file updated on structural decisions.
- If the directory is empty, run the `bootstrap-project` workflow first (see
  `.antigravity/workflows/`) rather than improvising a structure.

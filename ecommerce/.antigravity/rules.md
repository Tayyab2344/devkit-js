# Antigravity Custom Rules — Global

Always-on. Applies regardless of which AGENTS.md persona is active.

## Non-negotiables

1. **Multi-tenant isolation.** Every query touching company-owned data is scoped by
   `company_id` through the shared FastAPI dependency. No exceptions, no "I'll add
   scoping later."
2. **Money is integer cents.** No floats for currency, anywhere, backend or frontend.
   Discount totals shown to the user must come from the server response, not be
   recomputed client-side and trusted.
3. **Auth on every mutating route.** Every `POST`/`PATCH`/`DELETE` FastAPI route has an
   explicit `Depends()` for auth + role. Nothing is "internal only" by convention.
4. **No secrets in code.** Keys/DB URLs/webhook secrets live in `.env` (backend) or
   `.env.local` (frontend), never committed, never inline.
5. **Alembic migrations only.** No manual schema edits against the running DB.

## Code style

**Backend (FastAPI/Python)**
- Type hints everywhere; Pydantic v2 models for all request/response shapes.
- One router per resource; business logic in `/services`, not in route handlers.
- `black` + `ruff` clean before considering a task done.
- Async endpoints (`async def`) with an async DB session — don't mix sync and async DB
  calls in the same request path.

**Frontend (Next.js/TypeScript)**
- Strict TypeScript, no `any` without a comment explaining why.
- Server Components by default; `"use client"` only where interactivity requires it.
- One typed API client module — don't scatter raw `fetch` calls across components.

## Process rules

- Empty/near-empty repo → run `.antigravity/workflows/bootstrap-project.md` before
  writing feature code.
- Before implementing anything touching money/coupons/payouts, update the relevant
  section of `ARCHITECTURE.md` first, then implement.
- After a schema change, note it in `ARCHITECTURE.md`'s entity list.
- Don't delete or weaken an existing test to make a change pass — fix the code or flag
  the test as wrong and ask.
- Ask before guessing whether an action is Super Admin / Company / User scoped.

## Definition of Done (self-check before finishing any task)

- [ ] All new money fields are integers.
- [ ] Every new company-scoped query is filtered by `company_id`.
- [ ] Every new mutating route has an auth + role dependency.
- [ ] At least one failure-case test exists (wrong role, wrong tenant, expired coupon).
- [ ] No secrets hardcoded; `.env*` gitignored.
- [ ] `ARCHITECTURE.md` updated if a schema or contract changed.

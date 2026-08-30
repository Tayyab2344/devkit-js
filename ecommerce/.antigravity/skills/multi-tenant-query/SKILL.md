---
name: multi-tenant-query
description: Use whenever writing or reviewing a database query, repository function, or FastAPI route that reads/writes company-owned data (products, orders, coupons, payouts). Ensures company_id scoping is never skipped.
---

# Multi-Tenant Query Scoping

## When this applies
Any SQLModel/SQLAlchemy query touching a table with a `company_id` column — Product,
Order Item, Coupon (company-scoped), Payout, or anything added later with a
`company_id` FK.

## Rule
Every such query MUST filter by `company_id`, sourced from the `get_company_scope`
FastAPI dependency — never from a raw path/query param the client controls, and never
omitted "temporarily."

Exception: Super Admin routes may query across all companies, but only through a
dependency that explicitly asserts `role == super_admin`, and the bypass is logged.

## Checklist before writing the query
1. Does this table have a `company_id` column? If yes → scope required.
2. Is `company_id` coming from the authenticated session/dependency, not from client
   input? (A user must never be able to pass `?company_id=X` to read another
   company's data.)
3. If this is a Super Admin route, is the role check explicit and logged?

## Example (FastAPI + SQLModel)

```python
def get_company_scope(current_user: User = Depends(get_current_user)) -> int:
    if not current_user.company_id:
        raise HTTPException(403, "Not a company account")
    return current_user.company_id

@router.get("/products")
async def list_products(
    company_id: int = Depends(get_company_scope),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Product).where(Product.company_id == company_id)
    )
    return result.all()
```

Anti-pattern to flag in review: `select(Product)` with no `.where(Product.company_id == ...)`.

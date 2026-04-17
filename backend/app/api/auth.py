from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import Company, User
from app.schemas.company import OnboardingRequest, CompanyResponse

router = APIRouter()

@router.post("/onboarding", response_model=CompanyResponse)
async def onboarding(
    payload: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.rfc == payload.rfc))
    existing = result.scalar_one_or_none()
    if existing:
        current_user.company_id = existing.id
        await db.commit()
        return existing

    company = Company(
        nombre=payload.nombre,
        rfc=payload.rfc,
        sector=payload.sector,
        regiones=payload.regiones,
        cucop_codes=payload.cucop_codes,
    )
    db.add(company)
    await db.flush()
    current_user.company_id = company.id
    await db.commit()
    return company

@router.post("/register-user")
async def register_user(
    supabase_uid: str,
    email: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.supabase_uid == supabase_uid))
    if result.scalar_one_or_none():
        return {"status": "exists"}
    user = User(supabase_uid=supabase_uid, email=email)
    db.add(user)
    await db.commit()
    return {"status": "created"}

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "rol": current_user.rol,
    }

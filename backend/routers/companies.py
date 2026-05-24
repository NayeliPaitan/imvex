from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas
from auth import require_superadmin, get_password_hash

router = APIRouter(prefix="/api/admin/companies", tags=["admin-companies"])


@router.get("", response_model=List[schemas.CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    return db.query(models.Company).order_by(models.Company.created_at.desc()).all()


@router.post("", response_model=schemas.CompanyOut, status_code=201)
def create_company(
    payload: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = models.Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=schemas.CompanyOut)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


@router.put("/{company_id}", response_model=schemas.CompanyOut)
def update_company(
    company_id: int,
    payload: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    db.delete(company)
    db.commit()


# ─── Users per company ────────────────────────────────────────────────────────

@router.get("/{company_id}/users", response_model=List[schemas.UserOut])
def list_company_users(
    company_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    return db.query(models.User).filter(models.User.company_id == company_id).all()


@router.post("/{company_id}/users", response_model=schemas.UserOut, status_code=201)
def create_company_user(
    company_id: int,
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    existing = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="El usuario o email ya existe")

    user = models.User(
        company_id=company_id,
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/stats/summary")
def admin_stats(
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    total_companies = db.query(models.Company).count()
    active_companies = db.query(models.Company).filter(models.Company.is_active == True).count()
    total_users = db.query(models.User).filter(models.User.role != models.UserRole.superadmin).count()
    total_products = db.query(models.Product).count()
    total_sales = db.query(models.Sale).count()
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "total_users": total_users,
        "total_products": total_products,
        "total_sales": total_sales,
    }


@router.put("/{company_id}/users/{user_id}", response_model=schemas.UserOut)
def update_company_user(
    company_id: int,
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.company_id == company_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if "full_name" in payload:
        user.full_name = payload["full_name"]
    if "email" in payload:
        # check uniqueness
        existing = db.query(models.User).filter(
            models.User.email == payload["email"],
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email ya en uso")
        user.email = payload["email"]
    if "role" in payload:
        user.role = payload["role"]
    if "is_active" in payload:
        user.is_active = payload["is_active"]
    if "password" in payload and payload["password"]:
        from auth import get_password_hash
        user.hashed_password = get_password_hash(payload["password"])

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{company_id}/users/{user_id}", status_code=204)
def delete_company_user(
    company_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.company_id == company_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()


# ─── Company logo upload ──────────────────────────────────────────────────────

@router.post("/{company_id}/logo", response_model=schemas.CompanyOut)
async def upload_company_logo(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_superadmin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    contents = await file.read()
    if len(contents) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El logo no puede superar 3MB")

    import imghdr, base64
    img_type = imghdr.what(None, h=contents)
    if img_type not in ("jpeg", "png", "gif", "webp"):
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG o PNG")

    b64 = base64.b64encode(contents).decode("utf-8")
    mime = "image/jpeg" if img_type == "jpeg" else f"image/{img_type}"
    company.logo_url = f"data:{mime};base64,{b64}"
    db.commit()
    db.refresh(company)
    return company

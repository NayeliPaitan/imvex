from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import datetime, date
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _get_company_id(current_user: models.User) -> int:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Sin empresa asignada")
    return current_user.company_id


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    return db.query(models.Category).filter(models.Category.company_id == company_id).all()


@router.post("/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    cat = models.Category(company_id=company_id, **payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    cat = db.query(models.Category).filter(
        models.Category.id == cat_id,
        models.Category.company_id == company_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(cat)
    db.commit()


# ─── Movements ────────────────────────────────────────────────────────────────

@router.get("/movements", response_model=List[schemas.MovementOut])
def list_movements(
    product_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    q = db.query(models.InventoryMovement).filter(
        models.InventoryMovement.company_id == company_id
    )
    if product_id:
        q = q.filter(models.InventoryMovement.product_id == product_id)
    return q.order_by(models.InventoryMovement.created_at.desc()).limit(200).all()


@router.post("/movements", response_model=schemas.MovementOut, status_code=201)
def create_movement(
    payload: schemas.MovementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    product = db.query(models.Product).filter(
        models.Product.id == payload.product_id,
        models.Product.company_id == company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    prev_stock = product.stock
    if payload.movement_type == "in":
        product.stock += payload.quantity
    elif payload.movement_type == "out":
        if product.stock < payload.quantity:
            raise HTTPException(status_code=400, detail="Stock insuficiente")
        product.stock -= payload.quantity
    elif payload.movement_type == "adjustment":
        product.stock = payload.quantity
    else:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

    movement = models.InventoryMovement(
        company_id=company_id,
        product_id=payload.product_id,
        user_id=current_user.id,
        movement_type=payload.movement_type,
        quantity=payload.quantity,
        previous_stock=prev_stock,
        new_stock=product.stock,
        reason=payload.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    today = date.today()

    total_products = db.query(models.Product).filter(
        models.Product.company_id == company_id,
        models.Product.is_active == True
    ).count()

    low_stock = db.query(models.Product).filter(
        models.Product.company_id == company_id,
        models.Product.is_active == True,
        models.Product.stock <= models.Product.stock_minimum
    ).count()

    sales_today = db.query(func.coalesce(func.sum(models.Sale.total_amount), 0)).filter(
        models.Sale.company_id == company_id,
        func.date(models.Sale.sale_date) == today
    ).scalar()

    sales_month = db.query(func.coalesce(func.sum(models.Sale.total_amount), 0)).filter(
        models.Sale.company_id == company_id,
        extract("month", models.Sale.sale_date) == today.month,
        extract("year", models.Sale.sale_date) == today.year,
    ).scalar()

    # Top 5 products by sales quantity this month
    top_raw = (
        db.query(
            models.Product.name,
            func.sum(models.SaleItem.quantity).label("qty"),
            func.sum(models.SaleItem.subtotal).label("revenue"),
        )
        .join(models.SaleItem, models.SaleItem.product_id == models.Product.id)
        .join(models.Sale, models.Sale.id == models.SaleItem.sale_id)
        .filter(
            models.Sale.company_id == company_id,
            extract("month", models.Sale.sale_date) == today.month,
            extract("year", models.Sale.sale_date) == today.year,
        )
        .group_by(models.Product.name)
        .order_by(func.sum(models.SaleItem.quantity).desc())
        .limit(5)
        .all()
    )

    recent_sales = (
        db.query(models.Sale)
        .filter(models.Sale.company_id == company_id)
        .order_by(models.Sale.sale_date.desc())
        .limit(5)
        .all()
    )

    return {
        "total_products": total_products,
        "low_stock_count": low_stock,
        "total_sales_today": float(sales_today),
        "total_sales_month": float(sales_month),
        "top_products": [
            {"name": r.name, "qty": int(r.qty), "revenue": float(r.revenue)}
            for r in top_raw
        ],
        "recent_sales": [
            {
                "id": s.id,
                "total": float(s.total_amount),
                "date": s.sale_date.isoformat(),
                "status": s.status,
            }
            for s in recent_sales
        ],
    }


# ─── My company info (for POS boleta) ────────────────────────────────────────

@router.get("/company-info")
def my_company_info(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {
        "id": company.id,
        "name": company.name,
        "ruc": company.ruc,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "logo_url": company.logo_url,
    }

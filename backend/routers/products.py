from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/products", tags=["products"])


def _get_company_id(current_user: models.User) -> int:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Sin empresa asignada")
    return current_user.company_id


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    q = db.query(models.Product).options(joinedload(models.Product.category)).filter(
        models.Product.company_id == company_id,
        models.Product.is_active == True,
    )
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    if low_stock:
        q = q.filter(models.Product.stock <= models.Product.stock_minimum)
    return q.order_by(models.Product.name).all()


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    product = models.Product(company_id=company_id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    product = db.query(models.Product).options(joinedload(models.Product.category)).filter(
        models.Product.id == product_id,
        models.Product.company_id == company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.is_active = False
    db.commit()

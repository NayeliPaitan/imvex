from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import List
from decimal import Decimal
from datetime import date, datetime, timezone
import pytz

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/sales", tags=["sales"])

LIMA_TZ = pytz.timezone("America/Lima")

def _get_company_id(current_user: models.User) -> int:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Sin empresa asignada")
    return current_user.company_id


@router.get("", response_model=List[schemas.SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    return (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(models.Sale.company_id == company_id)
        .order_by(models.Sale.sale_date.desc())
        .limit(100)
        .all()
    )


@router.get("/today", response_model=List[schemas.SaleOut])
def sales_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ventas del día actual (hora Lima)."""
    company_id = _get_company_id(current_user)
    today = date.today()
    return (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(
            models.Sale.company_id == company_id,
            func.date(models.Sale.sale_date) == today,
            models.Sale.status == "completed",
        )
        .order_by(models.Sale.sale_date.desc())
        .all()
    )


@router.get("/cierre", )
def cierre_caja(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Resumen de cierre de caja del día actual."""
    company_id = _get_company_id(current_user)
    today = date.today()

    sales = (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(
            models.Sale.company_id == company_id,
            func.date(models.Sale.sale_date) == today,
            models.Sale.status == "completed",
        )
        .all()
    )

    # Group by payment method
    methods = {}
    for s in sales:
        pm = s.payment_method or "efectivo"
        if pm not in methods:
            methods[pm] = {"count": 0, "total": 0.0, "sales": []}
        methods[pm]["count"] += 1
        methods[pm]["total"] += float(s.total_amount)
        methods[pm]["sales"].append(s.id)

    total_general = sum(float(s.total_amount) for s in sales)
    total_descuentos = sum(float(s.discount) for s in sales)
    total_items = sum(sum(i.quantity for i in s.items) for s in sales)

    return {
        "fecha": today.isoformat(),
        "total_ventas": len(sales),
        "total_items": total_items,
        "total_descuentos": total_descuentos,
        "total_general": total_general,
        "por_metodo": methods,
        "detalle": [
            {
                "id": s.id,
                "hora": s.sale_date.strftime("%H:%M"),
                "total": float(s.total_amount),
                "descuento": float(s.discount),
                "metodo": s.payment_method,
                "items": [
                    {"producto": i.product.name if i.product else f"#{i.product_id}",
                     "qty": i.quantity, "subtotal": float(i.subtotal)}
                    for i in s.items
                ],
            }
            for s in sales
        ],
    }


@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    total = Decimal("0")
    items_to_create = []

    for item in payload.items:
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.company_id == company_id,
            models.Product.is_active == True,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}"
            )
        subtotal = item.unit_price * item.quantity
        total += subtotal
        items_to_create.append((product, item, subtotal))

    sale = models.Sale(
        company_id=company_id,
        user_id=current_user.id,
        total_amount=total - payload.discount,
        discount=payload.discount,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    db.add(sale)
    db.flush()

    for product, item, subtotal in items_to_create:
        prev_stock = product.stock
        product.stock -= item.quantity
        db.add(models.SaleItem(
            sale_id=sale.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=subtotal,
        ))
        db.add(models.InventoryMovement(
            company_id=company_id,
            product_id=product.id,
            user_id=current_user.id,
            movement_type="out",
            quantity=item.quantity,
            previous_stock=prev_stock,
            new_stock=product.stock,
            reason=f"Venta #{sale.id}",
            reference_id=sale.id,
        ))

    db.commit()
    db.refresh(sale)
    return sale


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    sale = (
        db.query(models.Sale)
        .options(joinedload(models.Sale.items).joinedload(models.SaleItem.product))
        .filter(models.Sale.id == sale_id, models.Sale.company_id == company_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return sale

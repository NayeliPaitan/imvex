from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from models import UserRole

# ─── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    company_id: Optional[int]
    full_name: str
    avatar_url: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

# ─── Company ──────────────────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    name: str
    ruc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[str] = "basic"

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    ruc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyOut(BaseModel):
    id: int
    name: str
    ruc: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    plan: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ─── User ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    company_id: Optional[int] = None
    username: str
    email: str
    full_name: Optional[str] = None
    password: str
    role: UserRole = UserRole.company_user

class UserOut(BaseModel):
    id: int
    company_id: Optional[int]
    username: str
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ─── Category ─────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}

# ─── Product ──────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    category_id: Optional[int] = None
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit_cost: Decimal = Decimal("0")
    sale_price: Decimal = Decimal("0")
    stock: int = 0
    stock_minimum: int = 0
    unit: str = "unidad"

class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit_cost: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    stock: Optional[int] = None
    stock_minimum: Optional[int] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None

class ProductOut(BaseModel):
    id: int
    company_id: int
    category_id: Optional[int]
    code: Optional[str]
    name: str
    description: Optional[str]
    unit_cost: Decimal
    sale_price: Decimal
    stock: int
    stock_minimum: int
    unit: str
    is_active: bool
    category: Optional[CategoryOut] = None
    model_config = {"from_attributes": True}

# ─── Sale ─────────────────────────────────────────────────────────────────────
class SaleItemIn(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal

class SaleCreate(BaseModel):
    items: List[SaleItemIn]
    discount: Decimal = Decimal("0")
    payment_method: str = "efectivo"
    notes: Optional[str] = None

class SaleItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    product: Optional[ProductOut] = None
    model_config = {"from_attributes": True}

class SaleOut(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int]
    sale_date: datetime
    total_amount: Decimal
    discount: Decimal
    payment_method: str
    notes: Optional[str]
    status: str
    items: List[SaleItemOut] = []
    model_config = {"from_attributes": True}

# ─── Inventory Movement ───────────────────────────────────────────────────────
class MovementCreate(BaseModel):
    product_id: int
    movement_type: str
    quantity: int
    reason: Optional[str] = None

class MovementOut(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: int
    previous_stock: Optional[int]
    new_stock: Optional[int]
    reason: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}

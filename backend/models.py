from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    company_admin = "company_admin"
    company_user = "company_user"


class Company(Base):
    __tablename__ = "companies"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    ruc        = Column(String(20), unique=True)
    address    = Column(Text)
    phone      = Column(String(30))
    email      = Column(String(150))
    logo_url   = Column(Text)
    is_active  = Column(Boolean, default=True)
    plan       = Column(String(50), default="basic")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    users      = relationship("User", back_populates="company")
    products   = relationship("Product", back_populates="company")
    categories = relationship("Category", back_populates="company")
    sales      = relationship("Sale", back_populates="company")


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    username        = Column(String(100), unique=True, nullable=False)
    email           = Column(String(150), unique=True, nullable=False)
    full_name       = Column(String(200))
    hashed_password = Column(Text, nullable=False)
    role            = Column(SAEnum(UserRole), default=UserRole.company_user)
    is_active       = Column(Boolean, default=True)
    avatar_url      = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="users")
    sales   = relationship("Sale", back_populates="user")


class Category(Base):
    __tablename__ = "categories"
    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(100), nullable=False)
    description = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    company  = relationship("Company", back_populates="categories")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    id            = Column(Integer, primary_key=True, index=True)
    company_id    = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    category_id   = Column(Integer, ForeignKey("categories.id"), nullable=True)
    code          = Column(String(50))
    name          = Column(String(200), nullable=False)
    description   = Column(Text)
    unit_cost     = Column(Numeric(12, 2), default=0)
    sale_price    = Column(Numeric(12, 2), default=0)
    stock         = Column(Integer, default=0)
    stock_minimum = Column(Integer, default=0)
    unit          = Column(String(30), default="unidad")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    company    = relationship("Company", back_populates="products")
    category   = relationship("Category", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product")
    movements  = relationship("InventoryMovement", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"
    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    sale_date      = Column(DateTime(timezone=True), server_default=func.now())
    total_amount   = Column(Numeric(12, 2), default=0)
    discount       = Column(Numeric(12, 2), default=0)
    payment_method = Column(String(30), default="efectivo")
    notes          = Column(Text)
    status         = Column(String(30), default="completed")
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="sales")
    user    = relationship("User", back_populates="sales")
    items   = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"
    id         = Column(Integer, primary_key=True, index=True)
    sale_id    = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal   = Column(Numeric(12, 2), nullable=False)
    sale    = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    product_id     = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    movement_type  = Column(String(30), nullable=False)
    quantity       = Column(Integer, nullable=False)
    previous_stock = Column(Integer)
    new_stock      = Column(Integer)
    reason         = Column(Text)
    reference_id   = Column(Integer)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    product = relationship("Product", back_populates="movements")

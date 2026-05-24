from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# Create all tables
Base.metadata.create_all(bind=engine)

from routers import auth, companies, products, sales, inventory

app = FastAPI(
    title="Sistema de Inventario y Ventas",
    description="API para la gestión de inventario y ventas con soporte multi-empresa",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(inventory.router)


@app.get("/")
def root():
    return {"message": "Sistema de Inventario API v1.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}

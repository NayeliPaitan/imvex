# Sistema de Inventario y Ventas
## Nayeli Paitan - Blake Dev

### Stack: FastAPI · PostgreSQL · React · Docker

Sistema multi-empresa con panel de superadmin(Saas) y módulo de ventas + inventario por empresa.

---

## Inicio rápido

### Requisitos
- Docker Desktop instalado y corriendo
- Puertos 5173, 8000, 5432 libres

### Levantar todo con un comando
```bash
docker-compose up --build
```

Accede a:
| URL | Descripción |
|-----|-------------|
| http://localhost:5173 | Frontend (React) |
| http://localhost:8000/docs | API Docs (Swagger) |
| http://localhost:8000/redoc | API Docs (Redoc) |

---

## Cuentas demo

|     Usuario    |   Contraseña   |              Rol               |
|----------------|----------------|--------------------------------|
| `superadmin`   | `admin123`     | Superadmin (panel de empresas) |
| `demo_admin`   | `empresa123`   | Demo Admin empresa             |
| `demo_userpos` | `empresapos`   | Demo Pos empresa               |

---

## Estructura del proyecto

```
imvex/
├── docker-compose.yml          # Orquestación de servicios
├── init.sql                    # Esquema BD + datos demo
│
├── backend/                    # FastAPI (Python)
│   ├── main.py                 # App entry point
│   ├── database.py             # Conexión PostgreSQL (SQLAlchemy)
│   ├── models.py               # Modelos ORM
│   ├── schemas.py              # Schemas Pydantic (validación)
│   ├── auth.py                 # JWT auth helpers
│   ├── requirements.txt
│   ├── Dockerfile
│   └── routers/
│       ├── auth.py             # POST /api/auth/login
│       ├── companies.py        # CRUD empresas (superadmin)
│       ├── products.py         # CRUD productos (por empresa)
│       ├── sales.py            # Registro de ventas
│       └── inventory.py        # Movimientos, categorías, dashboard
│
└── frontend/                   # React + Vite
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            # Entry point
        ├── App.jsx             # Router principal + rutas protegidas
        ├── api.js              # Axios client con interceptors JWT
        ├── index.css           # Design tokens + utilidades globales
        ├── contexts/
        │   └── AuthContext.jsx # Estado global de autenticación
        ├── hooks/
        │   └── useToast.js     # Notificaciones toast
        ├── components/
        │   └── Layout.jsx      # Sidebar + topbar compartido
        └── pages/
            ├── Login.jsx
            ├── admin/
            │   ├── Dashboard.jsx   # KPIs globales del sistema
            │   └── Companies.jsx   # CRUD empresas + usuarios
            └── company/
                ├── Dashboard.jsx   # KPIs de la empresa
                ├── Products.jsx    # CRUD productos
                ├── Categories.jsx  # CRUD categorías
                ├── Sales.jsx       # Registro de ventas (carrito)
                └── Inventory.jsx   # Movimientos de stock
```

---

## Arquitectura

```
Browser (React)
    │  HTTP + JWT
    ▼
FastAPI (Python)         ← Lógica de negocio, algoritmos, validaciones
    │  SQLAlchemy ORM
    ▼
PostgreSQL               ← Datos persistentes multi-empresa
```

### Multi-tenancy
Cada tabla operativa (`products`, `sales`, `categories`, `inventory_movements`) tiene
`company_id` como clave foránea. El backend filtra automáticamente por empresa usando
el JWT del usuario autenticado — ninguna empresa puede ver datos de otra.

---

## API Endpoints principales

### Auth
```
POST /api/auth/login          → Token JWT
GET  /api/auth/me             → Usuario actual
```

### Admin (requiere superadmin)
```
GET    /api/admin/companies              → Listar empresas
POST   /api/admin/companies              → Crear empresa
PUT    /api/admin/companies/{id}         → Actualizar empresa
DELETE /api/admin/companies/{id}         → Eliminar empresa
GET    /api/admin/companies/{id}/users   → Usuarios de empresa
POST   /api/admin/companies/{id}/users   → Crear usuario para empresa
GET    /api/admin/companies/stats/summary → Estadísticas globales
```

### Productos (requiere login empresa)
```
GET    /api/products          → Listar (filtros: search, category_id, low_stock)
POST   /api/products          → Crear producto
PUT    /api/products/{id}     → Actualizar producto
DELETE /api/products/{id}     → Desactivar producto
```

### Ventas
```
GET    /api/sales             → Historial de ventas
POST   /api/sales             → Registrar venta (descuenta stock automáticamente)
GET    /api/sales/{id}        → Detalle de venta
```

### Inventario
```
GET    /api/inventory/categories        → Listar categorías
POST   /api/inventory/categories        → Crear categoría
DELETE /api/inventory/categories/{id}   → Eliminar categoría
GET    /api/inventory/movements         → Historial de movimientos
POST   /api/inventory/movements         → Registrar movimiento (in/out/adjustment)
GET    /api/inventory/dashboard         → KPIs del dashboard
```

---

## Desarrollo sin Docker

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
DATABASE_URL=postgresql://admin:admin123@localhost:5432/imvex uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

---

## Próximas funcionalidades (Tesis - Capítulo IV)
- [ ] Clasificación ABC dinámica por historial de ventas + costo
- [ ] Cálculo automático de stock de seguridad (SS = Z × σd × √L)
- [ ] Punto de reorden dinámico (ROP = demanda promedio × lead time + SS)
- [ ] Detección de capital inmovilizado (productos sin rotación)
- [ ] Reportes PDF exportables
- [ ] Importación masiva de productos (CSV)
- [ ] Módulo de compras / órdenes a proveedores

-- ============================================================
-- IMVEX / INVENTORY SYSTEM - DATABASE INITIALIZATION
-- ============================================================

-- Roles
CREATE TYPE user_role AS ENUM ('superadmin', 'company_admin', 'company_user');

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    ruc         VARCHAR(20) UNIQUE,
    address     TEXT,
    phone       VARCHAR(30),
    email       VARCHAR(150),
    logo_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    plan        VARCHAR(50) DEFAULT 'basic',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    company_id    INT REFERENCES companies(id) ON DELETE CASCADE,
    username      VARCHAR(100) UNIQUE NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    full_name     VARCHAR(200),
    hashed_password TEXT NOT NULL,
    role          user_role DEFAULT 'company_user',
    is_active     BOOLEAN DEFAULT TRUE,
    avatar_url    TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Categories table (per company)
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Products table (per company)
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id     INT REFERENCES categories(id),
    code            VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    unit_cost       NUMERIC(12,2) DEFAULT 0,
    sale_price      NUMERIC(12,2) DEFAULT 0,
    stock           INT DEFAULT 0,
    stock_minimum   INT DEFAULT 0,
    unit            VARCHAR(30) DEFAULT 'unit',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         INT REFERENCES users(id),
    sale_date       TIMESTAMP DEFAULT NOW(),
    total_amount    NUMERIC(12,2) DEFAULT 0,
    discount        NUMERIC(12,2) DEFAULT 0,
    payment_method  VARCHAR(30) DEFAULT 'efectivo',
    notes           TEXT,
    status          VARCHAR(30) DEFAULT 'completed',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Sale items (detail)
CREATE TABLE IF NOT EXISTS sale_items (
    id          SERIAL PRIMARY KEY,
    sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  INT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL,
    unit_price  NUMERIC(12,2) NOT NULL,
    subtotal    NUMERIC(12,2) NOT NULL
);

-- Inventory movements
CREATE TABLE IF NOT EXISTS inventory_movements (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id      INT NOT NULL REFERENCES products(id),
    user_id         INT REFERENCES users(id),
    movement_type   VARCHAR(30) NOT NULL,  -- 'in', 'out', 'adjustment'
    quantity        INT NOT NULL,
    previous_stock  INT,
    new_stock       INT,
    reason          TEXT,
    reference_id    INT,   -- sale_id or purchase_id
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default superadmin (password: admin123)
INSERT INTO users (company_id, username, email, full_name, hashed_password, role)
VALUES (
    NULL,
    'superadmin',
    'admin@sistema.com',
    'Super Administrador',
    '$2b$12$Gx5C2fsHACb1SLe8pj2jXeVoJ.lAeVQ4oGaAX6/PIghhMSV.AiwXG',
    'superadmin'
) ON CONFLICT DO NOTHING;

-- Demo company
INSERT INTO companies (name, ruc, address, phone, email, plan)
VALUES (
    'EMPRESA DEMO',
    '20123456780',
    'Comas',
    '950595875',
    'demo@empresa.com',
    'professional'
) ON CONFLICT DO NOTHING;

-- Demo company admin (password: empresa123)
INSERT INTO users (company_id, username, email, full_name, hashed_password, role)
SELECT 
    c.id, 'demo_admin', 'demo@empresa.com', 'Administrador Demo',
    '$2b$12$GrIm/Me.W6.tWYDzikqdie.kn8u.ZHI0lH68Ve1RxbQXcu3cHkxFu',
    'company_admin'
FROM companies c WHERE c.ruc = '20123456780'
ON CONFLICT DO NOTHING;

-- Demo POS user (password: empresapos)
INSERT INTO users (company_id, username, email, full_name, hashed_password, role)
SELECT 
    c.id, 'demo_userpos', 'demopos@empresa.com', 'Usuario POS Demo',
    '$2b$12$.0qPdF9oYRsJQg8vpj/Dguiht2idu4TDv4xGsdGNwqutvMilzW2W.',
    'company_user'
FROM companies c WHERE c.ruc = '20123456780'
ON CONFLICT DO NOTHING;

-- Demo categories
INSERT INTO categories (company_id, name, description)
SELECT c.id, 'Lencería', 'Brasieres, trusas y ropa interior'
FROM companies c WHERE c.ruc = '20123456780' ON CONFLICT DO NOTHING;

INSERT INTO categories (company_id, name, description)
SELECT c.id, 'Fajas', 'Fajas moldeadoras y reductoras'
FROM companies c WHERE c.ruc = '20123456780' ON CONFLICT DO NOTHING;

INSERT INTO categories (company_id, name, description)
SELECT c.id, 'Ropa de Baño', 'Bikinis, trajes de baño y accesorios'
FROM companies c WHERE c.ruc = '20123456780' ON CONFLICT DO NOTHING;

INSERT INTO categories (company_id, name, description)
SELECT c.id, 'Medias y Pantis', 'Medias, pantis y calcetines'
FROM companies c WHERE c.ruc = '20123456780' ON CONFLICT DO NOTHING;

-- Demo products
INSERT INTO products (company_id, category_id, code, name, unit_cost, sale_price, stock, stock_minimum)
SELECT 
    c.id, cat.id, 'BRA-001', 'Brasier Push Up T34', 12.00, 25.00, 50, 10
FROM companies c, categories cat
WHERE c.ruc = '20123456780' AND cat.name = 'Lencería' AND cat.company_id = c.id
ON CONFLICT DO NOTHING;

INSERT INTO products (company_id, category_id, code, name, unit_cost, sale_price, stock, stock_minimum)
SELECT 
    c.id, cat.id, 'FAJ-001', 'Faja Reductora Premium', 35.00, 75.00, 20, 5
FROM companies c, categories cat
WHERE c.ruc = '20123456780' AND cat.name = 'Fajas' AND cat.company_id = c.id
ON CONFLICT DO NOTHING;

INSERT INTO products (company_id, category_id, code, name, unit_cost, sale_price, stock, stock_minimum)
SELECT 
    c.id, cat.id, 'TRU-001', 'Truza Algodón Pack x3', 8.00, 18.00, 80, 15
FROM companies c, categories cat
WHERE c.ruc = '20123456780' AND cat.name = 'Lencería' AND cat.company_id = c.id
ON CONFLICT DO NOTHING;

INSERT INTO products (company_id, category_id, code, name, unit_cost, sale_price, stock, stock_minimum)
SELECT 
    c.id, cat.id, 'MED-001', 'Medias Térmicas x2', 4.50, 10.00, 120, 20
FROM companies c, categories cat
WHERE c.ruc = '20123456780' AND cat.name = 'Medias y Pantis' AND cat.company_id = c.id
ON CONFLICT DO NOTHING;

-- =====================================================================
-- MM SMART STOCK — SUPABASE COMPREHENSIVE SCHEMA (FASE 1 & FASE 2)
-- Multi-Warehouse, Products, Contacts, Transactions, Expenses, and Ledger
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL GUDANG (MULTI-WAREHOUSE)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Gudang Awal
INSERT INTO public.warehouses (code, name, address, is_default)
VALUES 
    ('GUD-UTAMA', 'Gudang Utama', 'Jl. Pergudangan Sentra No. 12', true),
    ('GUD-CABANG', 'Gudang Cabang Barat', 'Ruko Sentra Niaga Blok B-4', false)
ON CONFLICT (code) DO NOTHING;

-- 2. TABEL MASTER PRODUK / SKU
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR(128) NOT NULL UNIQUE,
    nama_barang VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    satuan VARCHAR(32) NOT NULL DEFAULT 'Pcs',
    lokasi_rak VARCHAR(64) NOT NULL DEFAULT 'A-01',
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    batas_stok_minimum INTEGER NOT NULL DEFAULT 5,
    foto_produk_url TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_nama ON public.products (nama_barang);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);

-- 3. TABEL KONTAK / CRM (SUPPLIER & CUSTOMER)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('supplier', 'customer')),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    npwp VARCHAR(50),
    bank_account VARCHAR(100),
    notes TEXT,
    price_tier VARCHAR(20) DEFAULT 'retail',
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    total_billed NUMERIC(15, 2) DEFAULT 0,
    total_paid NUMERIC(15, 2) DEFAULT 0,
    balance_due NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL DOKUMEN TRANSAKSI STOK
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_number VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('masuk', 'keluar', 'opname', 'transfer', 'retur_pelanggan', 'retur_pemasok')),
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    contact_name VARCHAR(200),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    total_items INTEGER NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
    status VARCHAR(20) DEFAULT 'posted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL ITEM DETAIL TRANSAKSI
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    kode_sku VARCHAR(64) NOT NULL,
    nama_barang VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0
);

-- 6. TABEL BIAYA OPERASIONAL (EXPENSES)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABEL KARTU STOK LEDGER (IMMUTABLE LOG)
CREATE TABLE IF NOT EXISTS public.kartu_stok_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    tanggal_waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    no_bukti VARCHAR(64) NOT NULL,
    keterangan TEXT NOT NULL,
    masuk INTEGER NOT NULL DEFAULT 0 CHECK (masuk >= 0),
    keluar INTEGER NOT NULL DEFAULT 0 CHECK (keluar >= 0),
    sisa_stok INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. POLICIES & RLS (OPEN ACCESS FOR ANON/AUTHENTICATED IN MVP)
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kartu_stok_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for public on warehouses" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on transaction_items" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public on kartu_stok_ledger" ON public.kartu_stok_ledger FOR ALL USING (true) WITH CHECK (true);

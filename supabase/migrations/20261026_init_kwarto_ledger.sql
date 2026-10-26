-- =====================================================================
-- MM SMART STOCK — SUPABASE POSTGRESQL INITIAL MIGRATION
-- Digital Kwarto Ledger, Immutable Protocols, & Stock Opname Reconciliation
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL MASTER SKU
CREATE TABLE IF NOT EXISTS public.skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR(128) NOT NULL UNIQUE,
    nama_barang VARCHAR(255) NOT NULL,
    satuan VARCHAR(32) NOT NULL DEFAULT 'Pcs',
    lokasi_rak VARCHAR(64) NOT NULL,
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    batas_stok_minimum INTEGER NOT NULL DEFAULT 10,
    foto_produk_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_nama_barang ON public.skus (nama_barang);
CREATE INDEX IF NOT EXISTS idx_skus_barcode ON public.skus (barcode);
CREATE INDEX IF NOT EXISTS idx_skus_lokasi_rak ON public.skus (lokasi_rak);

-- 2. TABEL KARTU STOK LEDGER (EVENT SOURCING - APPEND ONLY)
CREATE TABLE IF NOT EXISTS public.kartu_stok_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES public.skus(id) ON DELETE RESTRICT,
    tanggal_waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    no_bukti VARCHAR(64) NOT NULL,
    keterangan TEXT NOT NULL,
    masuk INTEGER NOT NULL DEFAULT 0 CHECK (masuk >= 0),
    keluar INTEGER NOT NULL DEFAULT 0 CHECK (keluar >= 0),
    sisa_stok INTEGER NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_movement_nonzero CHECK (masuk > 0 OR keluar > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_sku_tanggal ON public.kartu_stok_ledger (sku_id, tanggal_waktu ASC);
CREATE INDEX IF NOT EXISTS idx_ledger_no_bukti ON public.kartu_stok_ledger (no_bukti);

-- 3. PROTOKOL IMMUTABILITAS (ANTI-EDIT & ANTI-DELETE TRIGGER)
CREATE OR REPLACE FUNCTION public.enforce_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'KLAUSUL PROTOKOL KWARTO: Baris Kartu Stok Ledger bersifat permanen dan tidak dapat diedit atau dihapus! Lakukan mutasi koreksi penyesuaian jika diperlukan.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kartu_stok_ledger_immutable ON public.kartu_stok_ledger;
CREATE TRIGGER trg_kartu_stok_ledger_immutable
BEFORE UPDATE OR DELETE ON public.kartu_stok_ledger
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ledger_immutability();

-- 4. TABEL SESI & ITEM STOCK OPNAME
DO $$ BEGIN
    CREATE TYPE opname_status AS ENUM ('draft', 'posted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.sesi_stock_opname (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_opname VARCHAR(64) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    petugas VARCHAR(128) NOT NULL,
    status opname_status NOT NULL DEFAULT 'draft',
    total_sku_diperiksa INTEGER NOT NULL DEFAULT 0,
    total_selisih_fisik INTEGER NOT NULL DEFAULT 0,
    total_selisih_nilai NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    catatan TEXT,
    posted_at TIMESTAMPTZ,
    posted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.item_stock_opname (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesi_id UUID NOT NULL REFERENCES public.sesi_stock_opname(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.skus(id) ON DELETE RESTRICT,
    stok_sistem INTEGER NOT NULL,
    stok_fisik INTEGER NOT NULL,
    selisih INTEGER GENERATED ALWAYS AS (stok_fisik - stok_sistem) STORED,
    harga_satuan NUMERIC(15, 2) NOT NULL,
    nilai_selisih NUMERIC(15, 2) GENERATED ALWAYS AS ((stok_fisik - stok_sistem) * harga_satuan) STORED,
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sesi_sku UNIQUE(sesi_id, sku_id)
);

CREATE INDEX IF NOT EXISTS idx_item_opname_sesi ON public.item_stock_opname (sesi_id);

-- 5. STORED PROCEDURE: RECORD ATOMIC MUTATION WITH ROW-LOCK
CREATE OR REPLACE FUNCTION public.record_ledger_mutation(
    p_sku_id UUID,
    p_tanggal_waktu TIMESTAMPTZ,
    p_no_bukti VARCHAR,
    p_keterangan TEXT,
    p_masuk INTEGER,
    p_keluar INTEGER,
    p_created_by UUID DEFAULT NULL
)
RETURNS public.kartu_stok_ledger AS $$
DECLARE
    v_last_balance INTEGER := 0;
    v_new_balance INTEGER := 0;
    v_result public.kartu_stok_ledger;
BEGIN
    PERFORM 1 FROM public.skus WHERE id = p_sku_id FOR UPDATE;

    SELECT COALESCE(sisa_stok, 0)
    INTO v_last_balance
    FROM public.kartu_stok_ledger
    WHERE sku_id = p_sku_id
    ORDER BY tanggal_waktu DESC, created_at DESC
    LIMIT 1;

    IF v_last_balance IS NULL THEN
        v_last_balance := 0;
    END IF;

    v_new_balance := v_last_balance + p_masuk - p_keluar;

    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Stok tidak mencukupi! Sisa stok: %, pengeluaran: %', v_last_balance, p_keluar;
    END IF;

    INSERT INTO public.kartu_stok_ledger (
        sku_id, tanggal_waktu, no_bukti, keterangan, masuk, keluar, sisa_stok, created_by
    ) VALUES (
        p_sku_id, COALESCE(p_tanggal_waktu, NOW()), p_no_bukti, p_keterangan, p_masuk, p_keluar, v_new_balance, p_created_by
    ) RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. STORED PROCEDURE: RECONCILE & POST STOCK OPNAME
CREATE OR REPLACE FUNCTION public.post_stock_opname_reconciliation(
    p_sesi_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sesi RECORD;
    v_item RECORD;
    v_selisih_abs INTEGER;
    v_total_sku INTEGER := 0;
    v_total_selisih_fisik INTEGER := 0;
    v_total_selisih_nilai NUMERIC(15, 2) := 0.00;
BEGIN
    SELECT * INTO v_sesi FROM public.sesi_stock_opname WHERE id = p_sesi_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesi Opname ID % tidak ditemukan!', p_sesi_id;
    END IF;
    IF v_sesi.status = 'posted' THEN
        RAISE EXCEPTION 'Sesi Opname ini sudah diposting sebelumnya.';
    END IF;

    FOR v_item IN (SELECT * FROM public.item_stock_opname WHERE sesi_id = p_sesi_id) LOOP
        v_total_sku := v_total_sku + 1;
        v_total_selisih_fisik := v_total_selisih_fisik + v_item.selisih;
        v_total_selisih_nilai := v_total_selisih_nilai + v_item.nilai_selisih;

        IF v_item.selisih < 0 THEN
            v_selisih_abs := ABS(v_item.selisih);
            PERFORM public.record_ledger_mutation(
                v_item.sku_id, NOW(), 'OPN-ADJ-' || v_sesi.no_opname,
                'Selisih Kurang Stock Opname #' || v_sesi.no_opname,
                0, v_selisih_abs, p_user_id
            );
        ELSIF v_item.selisih > 0 THEN
            PERFORM public.record_ledger_mutation(
                v_item.sku_id, NOW(), 'OPN-ADJ-' || v_sesi.no_opname,
                'Selisih Lebih Stock Opname #' || v_sesi.no_opname,
                v_item.selisih, 0, p_user_id
            );
        END IF;
    END LOOP;

    UPDATE public.sesi_stock_opname
    SET status = 'posted',
        total_sku_diperiksa = v_total_sku,
        total_selisih_fisik = v_total_selisih_fisik,
        total_selisih_nilai = v_total_selisih_nilai,
        posted_at = NOW(),
        posted_by = p_user_id
    WHERE id = p_sesi_id;

    RETURN jsonb_build_object(
        'success', true,
        'sesi_id', p_sesi_id,
        'total_sku', v_total_sku,
        'total_selisih_fisik', v_total_selisih_fisik,
        'total_selisih_nilai', v_total_selisih_nilai
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

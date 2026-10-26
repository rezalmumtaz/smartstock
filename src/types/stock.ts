export type SatuanBarang = 'Pcs' | 'Box' | 'Kg' | 'Meter' | 'Liter' | 'Unit' | 'Roll' | 'Set';

export type StatusStok = 'AMAN' | 'KRITIS' | 'KOSONG';

export interface SKU {
  id: string;
  kode_sku: string;
  barcode: string;
  nama_barang: string;
  satuan: SatuanBarang | string;
  lokasi_rak: string;
  harga_beli: number;          // Flat HPP
  batas_stok_minimum: number;  // Reorder Point (ROP)
  foto_produk_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KartuStokLedger {
  id: string;
  sku_id: string;
  tanggal_waktu: string;
  no_bukti: string;
  keterangan: string;
  masuk: number;
  keluar: number;
  sisa_stok: number;           // Computed running balance
  created_by?: string;
  created_at: string;
}

export type StatusOpname = 'draft' | 'posted';

export interface SesiStockOpname {
  id: string;
  no_opname: string;
  tanggal: string;
  petugas: string;
  status: StatusOpname;
  total_sku_diperiksa: number;
  total_selisih_fisik: number;
  total_selisih_nilai: number;
  catatan?: string;
  posted_at?: string;
  posted_by?: string;
  created_at: string;
}

export interface ItemStockOpname {
  id: string;
  sesi_id: string;
  sku_id: string;
  sku?: SKU;
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;             // stok_fisik - stok_sistem
  harga_satuan: number;
  nilai_selisih: number;       // selisih * harga_satuan
  catatan?: string;
  created_at: string;
}

export interface SKUWithCurrentStock extends SKU {
  sisa_stok: number;
  status_stok: StatusStok;
  total_nilai_aset: number;
  last_mutation_at?: string;
}

export interface VoiceParseResult {
  sku: string;
  nama_barang_terdengar?: string;
  jenis: 'Masuk' | 'Keluar';
  jumlah: number;
  keterangan: string;
  confidence_score?: number;
}

export interface InventorySummary {
  total_sku: number;
  total_nilai_aset: number;
  total_item_kritis: number;
  skus_kritis: Array<{
    sku: string;
    nama: string;
    rak: string;
    stok: number;
    min: number;
  }>;
}

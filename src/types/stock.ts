export type SatuanBarang = 'Pcs' | 'Box' | 'Dus' | 'Kg' | 'Gram' | 'Liter' | 'Meter' | 'Unit' | 'Roll' | 'Set' | 'Lusin' | 'Pack';

export type StatusStok = 'AMAN' | 'KRITIS' | 'KOSONG';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  is_default: boolean;
}

export interface CustomFieldValues {
  expiry_date?: string;
  color?: string;
  size?: string;
  batch_no?: string;
  serial_no?: string;
  [key: string]: any;
}

export interface SKU {
  id: string;
  kode_sku: string;
  barcode: string;
  nama_barang: string;
  deskripsi?: string;
  satuan: SatuanBarang | string;
  lokasi_rak: string;
  harga_beli: number;          // HPP / Beli
  harga_jual?: number;         // Harga Jual (opsional untuk backward compatibility)
  batas_stok_minimum: number;  // Safety stock alert
  foto_produk_url?: string;
  custom_fields?: CustomFieldValues;
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
  sisa_stok: number;
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
  selisih: number;
  harga_satuan: number;
  nilai_selisih: number;
  catatan?: string;
  created_at: string;
}

export interface SKUWithCurrentStock extends SKU {
  sisa_stok: number;
  status_stok: StatusStok;
  total_nilai_aset: number;
  last_mutation_at?: string;
  harga_jual?: number;
}

export type ContactType = 'supplier' | 'customer';

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  npwp?: string;
  bank_account?: string;
  notes?: string;
  price_tier?: 'retail' | 'wholesale';
  discount_percent?: number;
  total_billed: number;
  total_paid: number;
  balance_due: number;
}

export type TransactionType = 'masuk' | 'keluar' | 'opname' | 'transfer' | 'retur_pelanggan' | 'retur_pemasok';

export interface TransactionItem {
  id: string;
  sku_id: string;
  kode_sku: string;
  nama_barang: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface TransactionDoc {
  id: string;
  doc_number: string;
  type: TransactionType;
  warehouse_id: string;
  to_warehouse_id?: string;
  contact_id?: string;
  contact_name?: string;
  transaction_date: string;
  discount_percent?: number;
  tax_percent?: number;
  subtotal: number;
  grand_total: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  attachment_url?: string;
  items: TransactionItem[];
  created_at: string;
}

export interface ExpenseItem {
  id: string;
  warehouse_id: string;
  expense_date: string;
  amount: number;
  category: 'Listrik & Air' | 'Sewa Gudang' | 'Gaji & Upah' | 'Transport & Bensin' | 'Packing & Lakban' | 'Lainnya' | string;
  name: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
}

export interface VoiceParseResult {
  action?: 'TAMBAH_BARANG' | 'BARANG_MASUK' | 'BARANG_KELUAR' | 'BIAYA';
  sku?: string;
  jenis?: 'Masuk' | 'Keluar';
  nama_barang?: string;
  nama_barang_terdengar?: string;
  jumlah?: number;
  satuan?: string;
  harga_beli?: number;
  harga_jual?: number;
  nama_kontak?: string;
  keterangan?: string;
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

# Smart Stock

SaaS stok gudang multi-gudang, **PWA mobile-first** (Next.js 15 + Supabase). Dipakai admin gudang dari HP di lapangan, dan owner memantau semua gudang dari HP maupun desktop.

## Fitur fase 1

- **Login & onboarding**: daftar akun → buat perusahaan + gudang pertama (`create_tenant`).
- **Multi-gudang & role**
  - *Owner*: semua gudang, harga, laporan bisnis, tim, pengaturan.
  - *Admin gudang*: hanya gudang yang ditugaskan; tidak melihat harga, laba, atau data gudang lain. Dikunci di database (Row Level Security), bukan hanya di UI.
- **Barang**: katalog bersama, grup, barcode (scan kamera / buat otomatis EAN-13 internal), stok minimum, stok per gudang, riwayat pergerakan, harga khusus owner, ekspor Excel.
- **Dokumen stok**: Barang masuk, Barang keluar, Stok opname, Retur dari pelanggan, Retur ke pemasok. Draft → Posting; stok tidak bisa minus; nomor otomatis (IN-000001, …); owner bisa membatalkan (stok dikembalikan).
- **Transfer antar gudang** (tanpa omzet): Draft → Dikirim (stok asal berkurang, barang dalam perjalanan) → Diterima (qty diterima bisa dikoreksi; selisih tercatat).
- **Scan barcode**: kamera HP (ZXing), mode batch +1 per scan, atau pemindai eksternal / ketik manual.
- **Impor Excel** (.xlsx/.csv): Barang, Stok awal (dibuat sebagai dokumen “Saldo awal” lalu diposting), Pemasok/Pelanggan. Pencocokan kolom otomatis, pratinjau & validasi, unduh daftar error, template.
- **Laporan**: stok per gudang (+ nilai untuk owner), pergerakan stok, selisih transfer, penjualan & laba kotor (owner).
- **Pengaturan**: perusahaan (NPWP, rekening, kunci periode), gudang, tim & akses, pemasok/pelanggan.
- **PWA**: bisa dipasang ke layar utama HP, halaman offline sederhana.

## Menjalankan lokal

```bash
cp .env.example .env.local   # isi URL & publishable key Supabase
npm install
npm run dev
```

## Database

Skema ada di proyek Supabase **Smart Stock** (`gtugneyiqscmlaobdbdz`), dipasang lewat migrasi:

| Migrasi | Isi |
| --- | --- |
| `core_tables` | 17 tabel multi-tenant |
| `access_helpers_and_rls` | fungsi akses + kebijakan RLS per role & gudang |
| `triggers_and_audit` | nomor dokumen otomatis, penjaga status, audit log |
| `stock_posting_functions` | `post_document`, `send_transfer`, `receive_transfer`, `void_document`, `create_tenant`, `set_member`, `list_warehouse_names` |
| `fix_warehouses_select_policy`, `fk_covering_indexes` | perbaikan kebijakan & indeks |
| `excel_import_functions`, `import_match_by_code_first` | `import_items`, `import_opening_stock` |
| `list_members_and_remove_member` | manajemen tim |

Untuk menyimpan migrasi sebagai file di repo: `supabase link --project-ref gtugneyiqscmlaobdbdz && supabase db pull`.

Aturan penting: stok **tidak pernah diedit langsung**. Semua perubahan lewat dokumen yang diposting oleh fungsi database, dan setiap perubahan tercatat di `stock_movements` dan `audit_logs`.

## Konfigurasi Supabase Auth

Di Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: URL produksi aplikasi (misalnya `https://smart-stock-app.vercel.app`).
- **Redirect URLs**: tambahkan `https://<domain>/mulai`.

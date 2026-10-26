import { SKU, KartuStokLedger, SKUWithCurrentStock, SesiStockOpname, ItemStockOpname, StatusStok } from "@/types/stock";
import { INITIAL_SKUS, INITIAL_LEDGER } from "./mock-data";

const STORAGE_KEYS = {
  SKUS: "mm_smart_stock_skus",
  LEDGER: "mm_smart_stock_ledger",
  OPNAME_SESSIONS: "mm_smart_stock_opname_sessions",
  OPNAME_ITEMS: "mm_smart_stock_opname_items",
};

class LedgerService {
  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  // =========================================================================
  // SKU OPERATIONS
  // =========================================================================
  public getSKUs(): SKU[] {
    if (!this.isBrowser()) return INITIAL_SKUS;
    const stored = localStorage.getItem(STORAGE_KEYS.SKUS);
    if (!stored || stored === "[]" || stored === "null" || stored === "undefined") {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(INITIAL_SKUS));
      return INITIAL_SKUS;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(INITIAL_SKUS));
        return INITIAL_SKUS;
      }
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(INITIAL_SKUS));
      return INITIAL_SKUS;
    }
  }

  public getSKUById(id: string): SKU | undefined {
    return this.getSKUs().find((s) => s.id === id);
  }

  public getSKUByBarcode(barcode: string): SKU | undefined {
    const clean = barcode.trim().toLowerCase();
    return this.getSKUs().find(
      (s) => s.barcode.toLowerCase() === clean || s.kode_sku.toLowerCase() === clean
    );
  }

  public addSKU(
    newSku: Omit<SKU, "id" | "created_at" | "updated_at">,
    initialStock: number = 0
  ): SKU {
    const skus = this.getSKUs();
    const sku: SKU = {
      ...newSku,
      id: `sku-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    skus.push(sku);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(skus));
    }

    // Jika ada saldo awal, catat ke kartu stok ledger secara permanen
    if (initialStock > 0) {
      this.recordMutation({
        sku_id: sku.id,
        tanggal_waktu: new Date().toISOString(),
        no_bukti: `INIT-${sku.kode_sku}`,
        keterangan: "Saldo Awal Produk Baru",
        masuk: initialStock,
        keluar: 0,
        created_by: "Admin Gudang",
      });
    }

    return sku;
  }

  public updateSKU(id: string, updatedData: Partial<SKU>): SKU {
    const skus = this.getSKUs();
    const index = skus.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error("Produk SKU tidak ditemukan");
    }

    const updated: SKU = {
      ...skus[index],
      ...updatedData,
      updated_at: new Date().toISOString(),
    };

    skus[index] = updated;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(skus));
    }
    return updated;
  }

  public deleteSKU(id: string): void {
    const skus = this.getSKUs();
    const filtered = skus.filter((s) => s.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(filtered));
    }
  }

  // =========================================================================
  // KWARTO LEDGER OPERATIONS (IMMUTABLE & APPEND-ONLY)
  // =========================================================================
  public getLedger(): KartuStokLedger[] {
    if (!this.isBrowser()) return INITIAL_LEDGER;
    const stored = localStorage.getItem(STORAGE_KEYS.LEDGER);
    if (!stored || stored === "[]" || stored === "null" || stored === "undefined") {
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(INITIAL_LEDGER));
      return INITIAL_LEDGER;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(INITIAL_LEDGER));
        return INITIAL_LEDGER;
      }
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(INITIAL_LEDGER));
      return INITIAL_LEDGER;
    }
  }

  public getLedgerBySKU(skuId: string): KartuStokLedger[] {
    return this.getLedger()
      .filter((l) => l.sku_id === skuId)
      .sort((a, b) => new Date(a.tanggal_waktu).getTime() - new Date(b.tanggal_waktu).getTime());
  }

  public getLatestStockBalance(skuId: string): number {
    const entries = this.getLedgerBySKU(skuId);
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].sisa_stok;
  }

  /**
   * Catat mutasi kartu stok secara berurutan & permanen (Append-Only).
   * KLAUSUL PROTOKOL IMMUTABILITAS:
   * Tidak boleh meng-update atau menghapus data yang sudah masuk.
   */
  public recordMutation(params: {
    sku_id: string;
    tanggal_waktu?: string;
    no_bukti: string;
    keterangan: string;
    masuk: number;
    keluar: number;
    created_by?: string;
  }): KartuStokLedger {
    const { sku_id, tanggal_waktu, no_bukti, keterangan, masuk, keluar, created_by } = params;

    if (masuk === 0 && keluar === 0) {
      throw new Error("Jumlah mutasi tidak boleh nol (Masuk atau Keluar harus > 0).");
    }

    const currentBalance = this.getLatestStockBalance(sku_id);
    const newBalance = currentBalance + masuk - keluar;

    if (newBalance < 0) {
      throw new Error(
        `Stok tidak mencukupi! Sisa stok saat ini: ${currentBalance}, pengeluaran diminta: ${keluar}.`
      );
    }

    const ledgerEntry: KartuStokLedger = {
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku_id,
      tanggal_waktu: tanggal_waktu || new Date().toISOString(),
      no_bukti: no_bukti.trim() || `MUT-${Date.now().toString().slice(-6)}`,
      keterangan: keterangan.trim() || (masuk > 0 ? "Penerimaan Barang" : "Pengeluaran Barang"),
      masuk,
      keluar,
      sisa_stok: newBalance,
      created_by: created_by || "Petugas Gudang",
      created_at: new Date().toISOString(),
    };

    const allLedger = this.getLedger();
    allLedger.push(ledgerEntry);

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(allLedger));
    }

    return ledgerEntry;
  }

  // =========================================================================
  // ENRICHED VIEW: SKU DENGAN SISA STOK & STATUS ALARM FISIK
  // =========================================================================
  public getSKUsWithCurrentStock(): SKUWithCurrentStock[] {
    const skus = this.getSKUs();
    return skus.map((sku) => {
      const sisa_stok = this.getLatestStockBalance(sku.id);
      let status_stok: StatusStok = "AMAN";
      if (sisa_stok === 0) {
        status_stok = "KOSONG";
      } else if (sisa_stok <= sku.batas_stok_minimum) {
        status_stok = "KRITIS";
      }

      const total_nilai_aset = sisa_stok * sku.harga_beli;

      return {
        ...sku,
        sisa_stok,
        status_stok,
        total_nilai_aset,
      };
    });
  }

  // =========================================================================
  // STOCK OPNAME & REKONSILIASI OTOMATIS
  // =========================================================================
  public getOpnameSessions(): SesiStockOpname[] {
    if (!this.isBrowser()) return [];
    const stored = localStorage.getItem(STORAGE_KEYS.OPNAME_SESSIONS);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public getOpnameItems(sesiId: string): ItemStockOpname[] {
    if (!this.isBrowser()) return [];
    const stored = localStorage.getItem(STORAGE_KEYS.OPNAME_ITEMS);
    if (!stored) return [];
    try {
      const all: ItemStockOpname[] = JSON.parse(stored);
      return all.filter((i) => i.sesi_id === sesiId);
    } catch {
      return [];
    }
  }

  public createOpnameSession(petugas: string, catatan?: string): SesiStockOpname {
    const skusWithStock = this.getSKUsWithCurrentStock();
    const sesiId = `opn-${Date.now()}`;
    const noOpname = `OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newSession: SesiStockOpname = {
      id: sesiId,
      no_opname: noOpname,
      tanggal: new Date().toISOString().slice(0, 10),
      petugas: petugas || "Petugas Gudang",
      status: "draft",
      total_sku_diperiksa: skusWithStock.length,
      total_selisih_fisik: 0,
      total_selisih_nilai: 0,
      catatan,
      created_at: new Date().toISOString(),
    };

    // Buat snapshot item awal
    const items: ItemStockOpname[] = skusWithStock.map((s) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sesi_id: sesiId,
      sku_id: s.id,
      sku: s,
      stok_sistem: s.sisa_stok,
      stok_fisik: s.sisa_stok, // default awal sama dengan sistem
      selisih: 0,
      harga_satuan: s.harga_beli,
      nilai_selisih: 0,
      created_at: new Date().toISOString(),
    }));

    if (this.isBrowser()) {
      const sessions = this.getOpnameSessions();
      sessions.unshift(newSession);
      localStorage.setItem(STORAGE_KEYS.OPNAME_SESSIONS, JSON.stringify(sessions));

      const storedItems = localStorage.getItem(STORAGE_KEYS.OPNAME_ITEMS);
      const allItems: ItemStockOpname[] = storedItems ? JSON.parse(storedItems) : [];
      allItems.push(...items);
      localStorage.setItem(STORAGE_KEYS.OPNAME_ITEMS, JSON.stringify(allItems));
    }

    return newSession;
  }

  public updateOpnamePhysicalCount(itemId: string, stokFisik: number): ItemStockOpname {
    if (!this.isBrowser()) throw new Error("Browser only");
    const storedItems = localStorage.getItem(STORAGE_KEYS.OPNAME_ITEMS);
    if (!storedItems) throw new Error("No items");
    const items: ItemStockOpname[] = JSON.parse(storedItems);
    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) throw new Error("Item not found");

    const item = items[itemIndex];
    item.stok_fisik = Math.max(0, stokFisik);
    item.selisih = item.stok_fisik - item.stok_sistem;
    item.nilai_selisih = item.selisih * item.harga_satuan;

    items[itemIndex] = item;
    localStorage.setItem(STORAGE_KEYS.OPNAME_ITEMS, JSON.stringify(items));
    return item;
  }

  /**
   * Eksekusi Otomatis saat Sesi Opname di-POST:
   * Membuat baris penyesuaian di kartu stok ledger untuk setiap selisih.
   */
  public postOpnameReconciliation(sesiId: string): SesiStockOpname {
    if (!this.isBrowser()) throw new Error("Browser only");
    const sessions = this.getOpnameSessions();
    const session = sessions.find((s) => s.id === sesiId);
    if (!session) throw new Error("Sesi opname tidak ditemukan");
    if (session.status === "posted") throw new Error("Sesi ini sudah pernah di-post.");

    const items = this.getOpnameItems(sesiId);
    let totalSelisihFisik = 0;
    let totalSelisihNilai = 0;

    for (const item of items) {
      totalSelisihFisik += item.selisih;
      totalSelisihNilai += item.nilai_selisih;

      if (item.selisih < 0) {
        // Fisik < Sistem: Buat baris KELUAR
        this.recordMutation({
          sku_id: item.sku_id,
          tanggal_waktu: new Date().toISOString(),
          no_bukti: `ADJ-${session.no_opname}`,
          keterangan: `Penyesuaian Selisih Kurang Stock Opname #${session.no_opname}`,
          masuk: 0,
          keluar: Math.abs(item.selisih),
          created_by: session.petugas,
        });
      } else if (item.selisih > 0) {
        // Fisik > Sistem: Buat baris MASUK
        this.recordMutation({
          sku_id: item.sku_id,
          tanggal_waktu: new Date().toISOString(),
          no_bukti: `ADJ-${session.no_opname}`,
          keterangan: `Penyesuaian Selisih Lebih Stock Opname #${session.no_opname}`,
          masuk: item.selisih,
          keluar: 0,
          created_by: session.petugas,
        });
      }
    }

    session.status = "posted";
    session.total_selisih_fisik = totalSelisihFisik;
    session.total_selisih_nilai = totalSelisihNilai;
    session.posted_at = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.OPNAME_SESSIONS, JSON.stringify(sessions));
    return session;
  }
}

export const ledgerService = new LedgerService();

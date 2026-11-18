/** Baca & tulis Excel di browser (exceljs untuk .xlsx, papaparse untuk .csv). */

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: (string | number | null)[][];
}

function cellText(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
  if (o.richText) return o.richText.map((r) => r.text).join("");
  if (o.result !== undefined) return cellText(o.result);
  if (o.text !== undefined) return o.text;
  return String(v);
}

export async function readSpreadsheet(file: File): Promise<SheetData> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const all = parsed.data as string[][];
    const [headers = [], ...rows] = all;
    return { sheetName: "CSV", headers: headers.map((h) => String(h ?? "").trim()), rows };
  }
  if (name.endsWith(".xls")) {
    throw new Error("Format .xls (Excel lama) belum didukung. Buka file di Excel lalu Simpan Sebagai .xlsx atau .csv.");
  }
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets.find((w) => w.actualRowCount > 0) ?? wb.worksheets[0];
  if (!ws) throw new Error("File tidak berisi sheet");
  const grid: (string | number | null)[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals: (string | number | null)[] = [];
    for (let c = 1; c <= ws.columnCount; c++) vals.push(cellText(row.getCell(c).value));
    grid.push(vals);
  });
  const [headerRow = [], ...rows] = grid;
  const headers = headerRow.map((h) => String(h ?? "").trim());
  return { sheetName: ws.name, headers, rows: rows.filter((r) => r.some((v) => v !== null && String(v).trim() !== "")) };
}

export async function downloadXlsx(fileName: string, sheets: { name: string; columns: { header: string; key: string; width?: number }[]; rows: Record<string, unknown>[] }[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Smart Stock";
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 4) }));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7C66" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of s.rows) ws.addRow(r);
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- Definisi kolom impor ---------- */

export type ImportKind = "items" | "stock" | "contacts";

export interface TargetField { key: string; label: string; required?: boolean; ownerOnly?: boolean; aliases: string[] }

export const TARGETS: Record<ImportKind, TargetField[]> = {
  items: [
    { key: "name", label: "Nama barang", required: true, aliases: ["nama", "nama barang", "nama produk", "produk", "barang", "item", "name", "product"] },
    { key: "code", label: "Kode", aliases: ["kode", "kode barang", "sku", "code", "kode sku", "item code"] },
    { key: "barcode", label: "Barcode", aliases: ["barcode", "ean", "upc", "kode barcode"] },
    { key: "unit", label: "Satuan", aliases: ["satuan", "unit", "uom", "satuan ukuran"] },
    { key: "group", label: "Grup", aliases: ["grup", "group", "kategori", "category", "jenis"] },
    { key: "min_qty", label: "Stok minimum", aliases: ["stok minimum", "minimum", "min", "min qty", "kuantitas minimum", "batas stok"] },
    { key: "purchase_price", label: "Harga beli", ownerOnly: true, aliases: ["harga beli", "modal", "hpp", "harga pokok", "cost", "purchase price"] },
    { key: "sell_price", label: "Harga jual", ownerOnly: true, aliases: ["harga jual", "harga", "price", "sell price", "harga ecer"] },
    { key: "description", label: "Deskripsi", aliases: ["deskripsi", "keterangan", "description", "catatan"] },
  ],
  stock: [
    { key: "code", label: "Kode", aliases: ["kode", "kode barang", "sku", "code"] },
    { key: "barcode", label: "Barcode", aliases: ["barcode", "ean", "upc"] },
    { key: "qty", label: "Stok", aliases: ["stok", "qty", "jumlah", "kuantitas", "stock", "quantity", "stok awal", "saldo"] },
    { key: "location", label: "Lokasi simpan", aliases: ["lokasi", "lokasi simpan", "letak", "rak", "posisi", "tempat", "tempat simpan", "location", "bin"] },
  ],
  contacts: [
    { key: "name", label: "Nama", required: true, aliases: ["nama", "name", "nama kontak", "nama pemasok", "nama pelanggan", "supplier", "customer"] },
    { key: "contact_type", label: "Jenis (pemasok/pelanggan)", aliases: ["jenis", "tipe", "type", "kategori"] },
    { key: "phone", label: "Telepon", aliases: ["telepon", "telp", "hp", "no hp", "phone", "whatsapp", "wa"] },
    { key: "email", label: "Email", aliases: ["email", "e-mail"] },
    { key: "address", label: "Alamat", aliases: ["alamat", "address"] },
    { key: "notes", label: "Catatan", aliases: ["catatan", "notes", "keterangan"] },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Tebak pemetaan kolom file → field Smart Stock berdasarkan judul kolom. */
export function guessMapping(kind: ImportKind, headers: string[]): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  const used = new Set<number>();
  for (const t of TARGETS[kind]) {
    let found: number | null = null;
    headers.forEach((h, i) => {
      if (found !== null || used.has(i)) return;
      const n = norm(h);
      if (t.aliases.includes(n) || n === norm(t.label)) found = i;
    });
    if (found === null) {
      headers.forEach((h, i) => {
        if (found !== null || used.has(i)) return;
        const n = norm(h);
        if (n && t.aliases.some((a) => n.includes(a) && a.length >= 4)) found = i;
      });
    }
    if (found !== null) used.add(found);
    map[t.key] = found;
  }
  return map;
}

export function templateFor(kind: ImportKind) {
  const cols = TARGETS[kind].map((t) => ({ header: t.label, key: t.key, width: Math.max(14, t.label.length + 4) }));
  const sample: Record<ImportKind, Record<string, unknown>[]> = {
    items: [{ name: "Gelas kaca 300 ml", code: "GLS-300", barcode: "8991234500017", unit: "pcs", group: "Perabot", min_qty: 20, purchase_price: 5000, sell_price: 8000, description: "" }],
    stock: [{ code: "GLS-300", barcode: "", qty: 120, location: "Lt 1 · Rak kanan · atas" }],
    contacts: [{ name: "CV Sumber Kaca", contact_type: "pemasok", phone: "081234567890", email: "", address: "Bandung", notes: "" }],
  };
  return { columns: cols, rows: sample[kind] };
}

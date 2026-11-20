/** Katalog digital: PDF bergambar dan teks WhatsApp dari daftar barang. */
import { fmtDate, fmtQty, fmtRp, todayISO } from "./format";

export type StockMode = "qty" | "status" | "none";
export type PhotoMode = "main" | "all" | "none";

export interface CatalogEntry {
  name: string;
  code: string | null;
  unit: string | null;
  group: string;
  price: number | null;
  qty: number;
  min: number | null;
  photos: string[];
  /** baris "Label: isi" jadi tabel spesifikasi di katalog */
  description?: string | null;
}

export interface CatalogOptions {
  title: string;
  company: string;
  contact: string;
  note: string;
  stock: StockMode;
  photos: PhotoMode;
  showPrice: boolean;
  showCode: boolean;
}

export function stockText(e: CatalogEntry, mode: StockMode) {
  if (mode === "none") return "";
  if (mode === "qty") return `Stok ${fmtQty(e.qty)} ${e.unit ?? ""}`.trim();
  if (e.qty <= 0) return "Habis";
  if (e.min !== null && e.qty <= Number(e.min)) return "Stok terbatas";
  return "Tersedia";
}

/** Teks siap tempel ke WhatsApp (format tebal/miring WhatsApp). */
export function catalogText(entries: CatalogEntry[], o: CatalogOptions) {
  const lines: string[] = [`*${o.title || o.company}*`, `${o.company} · ${fmtDate(todayISO())}`];
  if (o.note.trim()) lines.push(o.note.trim());
  lines.push("");
  const groups = groupBy(entries);
  for (const [g, list] of groups) {
    if (groups.length > 1 || g) lines.push(`_${g || "Lainnya"}_`);
    list.forEach((e, i) => {
      const parts = [e.name];
      if (o.showCode && e.code) parts[0] += ` (${e.code})`;
      if (o.showPrice && e.price !== null) parts.push(fmtRp(e.price));
      const st = stockText(e, o.stock);
      if (st) parts.push(st);
      lines.push(`${i + 1}. ${parts.join(" — ")}`);
    });
    lines.push("");
  }
  if (o.contact.trim()) lines.push(`Pemesanan: ${o.contact.trim()}`);
  return lines.join("\n").trim();
}

function groupBy(entries: CatalogEntry[]) {
  const m = new Map<string, CatalogEntry[]>();
  for (const e of entries) { if (!m.has(e.group)) m.set(e.group, []); m.get(e.group)!.push(e); }
  // Grup berurutan A–Z; barang tanpa grup ("Lainnya") selalu paling akhir.
  return [...m.entries()].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || a[0].localeCompare(b[0], "id"));
}

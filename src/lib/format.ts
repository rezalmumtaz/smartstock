const numberFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export const fmtQty = (n: number | null | undefined) => numberFmt.format(Number(n ?? 0));
export const fmtRp = (n: number | null | undefined) => rupiahFmt.format(Number(n ?? 0));

/** Rupiah ringkas: Rp 48,2 jt */
export function fmtRpShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `Rp ${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6) return `Rp ${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return fmtRp(n);
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const date = d.length <= 10 ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Terima "1.234,5" atau "1234.5" → angka; null jika kosong/tidak valid. */
export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

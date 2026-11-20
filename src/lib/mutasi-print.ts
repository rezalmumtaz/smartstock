/** Cetak laporan mutasi barang (HTML → dialog cetak bawaan: printer atau simpan PDF). */
import { fmtDate, fmtQty } from "./format";

export type MutasiPrintKind = "rekap" | "kartu" | "cek";
export type MutasiPaper = "a4" | "f4";
export type MutasiSort = "nama" | "lokasi" | "grup";
export type MutasiMoveFilter = "semua" | "masuk" | "keluar";

export interface MutasiPrintOptions {
  kind: MutasiPrintKind;
  paper: MutasiPaper;
  sort: MutasiSort;
  /** Kartu stok: jenis pergerakan yang dicetak. */
  moves: MutasiMoveFilter;
  /** Kartu stok: tiap barang mulai di halaman baru. */
  pagePerItem: boolean;
  /** Kolom tanda tangan di akhir laporan. */
  signatures: boolean;
}

export interface PrintMove { at: string; type: string; qty: number; docNo: string; party: string; warehouse: string }
export interface PrintItem {
  name: string; code: string | null; unit: string | null; group: string; location: string;
  awal: number; masuk: number; keluar: number; sesuai: number; akhir: number;
  /** urut dari lama ke baru */
  moves: PrintMove[];
}
export interface MutasiPrintData {
  company: string;
  logo?: string | null;
  warehouse: string;
  from: string;
  to: string;
  printedBy: string;
  filterNote: string;
  items: PrintItem[];
}

export const MOVE_LABEL: Record<string, string> = {
  in: "Barang masuk", return_in: "Retur dari pelanggan", transfer_in: "Transfer masuk",
  out: "Barang keluar", return_out: "Retur ke pemasok", transfer_out: "Transfer keluar",
  opname_adjust: "Penyesuaian opname", void_reversal: "Pembatalan dokumen",
};
const IN_TYPES = ["in", "return_in", "transfer_in"];
const OUT_TYPES = ["out", "return_out", "transfer_out"];

const esc = (s: string | null | undefined) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const q = (n: number) => esc(fmtQty(n));
const signed = (n: number) => (n > 0 ? `+${q(n)}` : n < 0 ? `−${q(-n)}` : "0");
const dt = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const TITLES: Record<MutasiPrintKind, string> = { rekap: "Rekap Mutasi Barang", kartu: "Kartu Stok (Rincian Mutasi)", cek: "Lembar Cek Stok Fisik" };

export function sortItems(items: PrintItem[], sort: MutasiSort): PrintItem[] {
  const byName = (a: PrintItem, b: PrintItem) => a.name.localeCompare(b.name, "id", { numeric: true });
  const lastIfEmpty = (a: string, b: string) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b, "id", { numeric: true });
  return [...items].sort((a, b) =>
    sort === "lokasi" ? lastIfEmpty(a.location, b.location) || byName(a, b)
    : sort === "grup" ? lastIfEmpty(a.group, b.group) || byName(a, b)
    : byName(a, b));
}

export function mutasiPrintHtml(d: MutasiPrintData, o: MutasiPrintOptions): string {
  const items = sortItems(d.items, o.sort);
  const size = o.paper === "f4" ? "215mm 330mm" : "A4";
  const period = `${fmtDate(d.from)} – ${fmtDate(d.to)}`;
  const head = `
<div class="h">
  <div class="co">${d.logo ? `<img src="${esc(d.logo)}" alt="">` : ""}<div><h1>${esc(d.company)}</h1><h2>${esc(TITLES[o.kind])}</h2></div></div>
  <table class="meta">
    <tr><td>Gudang</td><td>${esc(d.warehouse)}</td></tr>
    ${o.kind === "cek" ? `<tr><td>Stok per</td><td>${esc(fmtDate(d.to))}</td></tr>` : `<tr><td>Periode</td><td>${esc(period)}</td></tr>`}
    <tr><td>Dicetak</td><td>${esc(new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }))}${d.printedBy ? ` · ${esc(d.printedBy)}` : ""}</td></tr>
    ${d.filterNote ? `<tr><td>Filter</td><td>${esc(d.filterNote)}</td></tr>` : ""}
  </table>
</div>`;

  let body = "";
  if (o.kind === "rekap") {
    const tot = items.reduce((s, r) => ({ masuk: s.masuk + r.masuk, keluar: s.keluar + r.keluar, sesuai: s.sesuai + r.sesuai }), { masuk: 0, keluar: 0, sesuai: 0 });
    body = `<table class="t"><thead><tr><th class="n">No</th><th>Barang</th><th>Lokasi</th><th>Sat.</th><th class="r">Awal</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Penyes.</th><th class="r">Akhir</th></tr></thead><tbody>
${items.map((r, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(r.name)}</b>${r.code ? `<span class="s">${esc(r.code)}</span>` : ""}</td><td>${esc(r.location)}</td><td>${esc(r.unit)}</td><td class="r">${q(r.awal)}</td><td class="r in">${r.masuk ? `+${q(r.masuk)}` : "0"}</td><td class="r out">${r.keluar ? `−${q(r.keluar)}` : "0"}</td><td class="r">${signed(r.sesuai)}</td><td class="r b">${q(r.akhir)}</td></tr>`).join("\n")}
<tr class="tot"><td></td><td colspan="4">Total ${items.length} barang</td><td class="r">${signed(tot.masuk)}</td><td class="r">${signed(-tot.keluar)}</td><td class="r">${signed(tot.sesuai)}</td><td></td></tr>
</tbody></table>`;
  } else if (o.kind === "cek") {
    body = `<table class="t cek"><thead><tr><th class="n">No</th><th>Barang</th><th>Lokasi</th><th>Sat.</th><th class="r">Stok sistem</th><th class="w">Fisik</th><th class="w">Selisih</th><th class="w2">Keterangan</th></tr></thead><tbody>
${items.map((r, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(r.name)}</b>${r.code ? `<span class="s">${esc(r.code)}</span>` : ""}</td><td>${esc(r.location)}</td><td>${esc(r.unit)}</td><td class="r b">${q(r.akhir)}</td><td></td><td></td><td></td></tr>`).join("\n")}
</tbody></table>`;
  } else {
    const pick = (m: PrintMove) => o.moves === "semua" || (o.moves === "masuk" ? IN_TYPES.includes(m.type) || (m.qty > 0 && !OUT_TYPES.includes(m.type)) : OUT_TYPES.includes(m.type) || (m.qty < 0 && !IN_TYPES.includes(m.type)));
    body = items.map((r, idx) => {
      let saldo = r.awal;
      const rows = r.moves.map((m) => {
        saldo += m.qty;
        if (!pick(m)) return "";
        return `<tr><td class="d">${esc(dt(m.at))}</td><td>${esc(MOVE_LABEL[m.type] ?? m.type)}</td><td>${esc(m.docNo)}</td><td>${esc(m.party)}</td><td class="r in">${m.qty > 0 ? q(m.qty) : ""}</td><td class="r out">${m.qty < 0 ? q(-m.qty) : ""}</td><td class="r b">${q(saldo)}</td><td class="ck"></td></tr>`;
      }).filter(Boolean);
      return `<section class="card${o.pagePerItem && idx > 0 ? " brk" : ""}">
<div class="ch"><div><b>${esc(r.name)}</b><span class="s">${[r.code, r.group, r.unit ? `Satuan ${r.unit}` : ""].filter(Boolean).map(esc).join(" · ")}</span></div><div class="loc">${r.location ? `Lokasi: <b>${esc(r.location)}</b>` : ""}</div></div>
<table class="t"><thead><tr><th class="d">Tanggal</th><th>Jenis</th><th>No. dokumen</th><th>Pihak</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Saldo</th><th class="ck">Cek</th></tr></thead><tbody>
<tr class="sa"><td colspan="6">Saldo awal ${esc(fmtDate(d.from))}</td><td class="r b">${q(r.awal)}</td><td></td></tr>
${rows.length ? rows.join("\n") : `<tr><td colspan="8" class="em">Tidak ada pergerakan${o.moves !== "semua" ? ` ${o.moves}` : ""} di periode ini.</td></tr>`}
<tr class="tot"><td colspan="4">Masuk ${signed(r.masuk)} · Keluar ${signed(-r.keluar)}${r.sesuai ? ` · Penyesuaian ${signed(r.sesuai)}` : ""}</td><td colspan="2" class="r">Saldo akhir</td><td class="r b">${q(r.akhir)}</td><td></td></tr>
</tbody></table></section>`;
    }).join("\n");
  }

  const signs = o.signatures ? `<div class="sg">${["Dibuat oleh", "Diperiksa oleh", "Mengetahui"].map((l) => `<div><span>${l}</span><i></i><span class="nm">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span></div>`).join("")}</div>` : "";

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(TITLES[o.kind])} ${esc(period)}</title>
<style>
@page { size: ${size}; margin: 12mm 10mm 14mm; @bottom-right { content: "Hal. " counter(page) " / " counter(pages); font: 8pt sans-serif; color: #667085; } @bottom-left { content: "${esc(d.company)} · ${esc(TITLES[o.kind])}"; font: 8pt sans-serif; color: #667085; } }
* { box-sizing: border-box; }
body { font: 9.5pt/1.35 "Segoe UI", Roboto, Arial, sans-serif; color: #101828; margin: 0; }
.h { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #0E7C66; padding-bottom: 6px; margin-bottom: 8px; }
.co { display: flex; gap: 10px; align-items: center; } .co img { max-height: 16mm; max-width: 38mm; object-fit: contain; }
h1 { font-size: 13pt; margin: 0; } h2 { font-size: 11pt; margin: 2px 0 0; color: #0E7C66; }
.meta { font-size: 8.5pt; border-collapse: collapse; } .meta td { padding: 0 0 1px 8px; vertical-align: top; } .meta td:first-child { color: #667085; }
.t { width: 100%; border-collapse: collapse; } .t th, .t td { border: 1px solid #C9CED6; padding: 3px 5px; vertical-align: top; }
.t thead th { background: #EEF2F1; font-size: 8pt; text-transform: uppercase; letter-spacing: .02em; text-align: left; }
.t thead { display: table-header-group; } .t tr { break-inside: avoid; }
.r { text-align: right !important; white-space: nowrap; } .b { font-weight: 700; } .n { width: 26px; text-align: center; color: #667085; }
.d { white-space: nowrap; width: 1%; } .ck { width: 28px; } .in { color: #0E7C66; } .out { color: #A15C07; }
.s { display: block; font-size: 8pt; color: #667085; font-weight: 400; }
.tot td { background: #F7F8FA; font-weight: 700; } .sa td { background: #FAFBFC; color: #475467; } .em { color: #667085; text-align: center; }
.cek td { height: 22px; } .cek .w { width: 60px; } .cek .w2 { width: 110px; }
.card { margin-bottom: 10px; break-inside: auto; } .card.brk { break-before: page; }
.ch { display: flex; justify-content: space-between; gap: 8px; align-items: flex-end; background: #E6F4F0; border: 1px solid #C9CED6; border-bottom: 0; padding: 4px 6px; }
.ch b { font-size: 10.5pt; } .loc { font-size: 8.5pt; white-space: nowrap; }
.sg { display: flex; justify-content: space-around; margin-top: 18px; break-inside: avoid; text-align: center; font-size: 9pt; }
.sg div { display: flex; flex-direction: column; align-items: center; } .sg i { height: 46px; } .sg .nm { color: #667085; }
@media screen { body { padding: 0 12px 24px; max-width: 900px; margin: 0 auto; } }
</style></head><body>
${head}
${body}
${signs}
</body></html>`;
}

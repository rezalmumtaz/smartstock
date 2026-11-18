// Bukti terima / ambil barang: tata letak teks untuk printer thermal (ESC/POS) dan HTML untuk cetak biasa.
import { fmtDate, fmtDateTime, fmtQty } from "./format";
import type { DocType, DocStatus } from "./types";

export type Paper = "58" | "80" | "a4";
export const PAPER_COLS: Record<"58" | "80", number> = { "58": 32, "80": 48 };

export interface ReceiptLine { name: string; code?: string | null; location?: string | null; qty: number; unit?: string | null; note?: string | null }
export interface ReceiptData {
  company: { name: string; address?: string | null; phone?: string | null };
  title: string;
  number: string;
  date: string;
  meta: [string, string][];
  lines: ReceiptLine[];
  notes?: string | null;
  signs: string[];
  footer: string;
  voided?: boolean;
}

/** Judul bukti sesuai jenis dokumen. */
export function receiptTitle(type: DocType, status: DocStatus): string {
  switch (type) {
    case "in": return "BUKTI PENERIMAAN BARANG";
    case "return_in": return "BUKTI PENERIMAAN RETUR";
    case "out": return "BUKTI PENGAMBILAN BARANG";
    case "return_out": return "BUKTI PENGELUARAN RETUR";
    case "transfer": return status === "received" ? "BUKTI PENERIMAAN TRANSFER" : "BUKTI PENGAMBILAN (TRANSFER)";
    case "opname": return "BERITA ACARA STOK OPNAME";
  }
}

export const nameFromEmail = (e?: string | null) => (e ? e.split("@")[0] : "");

// ---------- tata letak teks (dipakai printer thermal & pratinjau) ----------
export interface Row { t: string; c?: boolean; b?: boolean; big?: boolean }

/** Hilangkan aksara non-ASCII agar aman untuk printer thermal murah. */
export function ascii(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[·•]/g, "-").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x20-\x7E]/g, "?");
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of ascii(text).split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (w.length > width) { if (line) { out.push(line); line = ""; } out.push(w.slice(0, width)); w = w.slice(width); }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= width) line += " " + w;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

function between(left: string, right: string, cols: number): string[] {
  left = ascii(left); right = ascii(right);
  if (left.length + 1 + right.length <= cols) return [left + " ".repeat(cols - left.length - right.length) + right];
  const lw = wrap(left, cols);
  const last = lw[lw.length - 1];
  if (last.length + 1 + right.length <= cols) { lw[lw.length - 1] = last + " ".repeat(cols - last.length - right.length) + right; return lw; }
  return [...lw, " ".repeat(Math.max(0, cols - right.length)) + right];
}

function center(s: string, w: number): string {
  s = s.slice(0, w);
  const l = Math.floor((w - s.length) / 2);
  return " ".repeat(l) + s + " ".repeat(w - s.length - l);
}

export function layoutText(d: ReceiptData, cols: number): Row[] {
  const rows: Row[] = [];
  const hr = (ch = "-") => rows.push({ t: ch.repeat(cols) });
  const push = (lines: string[], o: Omit<Row, "t"> = {}) => lines.forEach((t) => rows.push({ t, ...o }));

  push(wrap(d.company.name.toUpperCase(), cols), { c: true, b: true, big: true });
  if (d.company.address) push(wrap(d.company.address, cols), { c: true });
  if (d.company.phone) push(wrap(`Telp ${d.company.phone}`, cols), { c: true });
  hr("=");
  push(wrap(d.title, cols), { c: true, b: true });
  if (d.voided) push(["*** DIBATALKAN ***"], { c: true, b: true });
  hr();
  const lw = Math.max(...d.meta.map(([k]) => k.length), 7);
  const kv = (k: string, v: string) => {
    const pre = k.padEnd(lw) + ": ";
    const body = wrap(v || "-", cols - pre.length);
    body.forEach((t, i) => rows.push({ t: (i === 0 ? pre : " ".repeat(pre.length)) + t }));
  };
  kv("No", d.number);
  kv("Tanggal", d.date);
  d.meta.forEach(([k, v]) => kv(k, v));
  hr();

  let total = 0;
  d.lines.forEach((l, i) => {
    total += l.qty;
    const no = `${i + 1}. `;
    const nameLines = wrap(l.name + (l.code ? ` (${l.code})` : ""), cols - no.length);
    nameLines.forEach((t, j) => rows.push({ t: (j === 0 ? no : " ".repeat(no.length)) + t, b: j === 0 }));
    const qty = `${fmtQty(l.qty)} ${l.unit ?? ""}`.trim();
    const left = l.location ? `Lok: ${l.location}` : "";
    between(left, qty, cols - no.length).forEach((t) => rows.push({ t: " ".repeat(no.length) + t, b: false }));
    if (l.note) wrap(l.note, cols - no.length).forEach((t) => rows.push({ t: " ".repeat(no.length) + t }));
  });
  hr();
  push(between(`Total ${d.lines.length} barang`, `${fmtQty(total)} unit`, cols), { b: true });
  if (d.notes) { rows.push({ t: "" }); push(wrap(`Ket: ${d.notes}`, cols)); }
  rows.push({ t: "" });

  // kolom tanda tangan
  const n = d.signs.length;
  const cw = Math.floor(cols / n);
  rows.push({ t: d.signs.map((s) => center(ascii(s), cw)).join("") });
  rows.push({ t: "" }, { t: "" }, { t: "" });
  rows.push({ t: d.signs.map(() => center("(" + ".".repeat(Math.max(4, cw - 4)) + ")", cw)).join("") });
  rows.push({ t: "" });
  push(wrap(d.footer, cols), { c: true });
  return rows.map((r) => (r.c ? { ...r, t: center(r.t.trim(), cols).trimEnd() } : r));
}

// ---------- ESC/POS ----------
export function escpos(d: ReceiptData, cols: number): Uint8Array {
  const out: number[] = [];
  const cmd = (...b: number[]) => out.push(...b);
  const text = (s: string) => { for (const ch of ascii(s)) out.push(ch.charCodeAt(0)); out.push(0x0a); };
  cmd(0x1b, 0x40); // init
  cmd(0x1b, 0x74, 0x00); // code page PC437
  for (const r of layoutText(d, cols)) {
    cmd(0x1b, 0x61, r.c ? 1 : 0);
    cmd(0x1b, 0x45, r.b ? 1 : 0);
    cmd(0x1d, 0x21, r.big ? 0x01 : 0x00); // tinggi ganda untuk nama usaha
    text(r.c ? r.t.trim() : r.t);
  }
  cmd(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00, 0x1b, 0x61, 0x00);
  cmd(0x1b, 0x64, 0x04); // feed 4 baris
  cmd(0x1d, 0x56, 0x42, 0x00); // potong (diabaikan printer tanpa pisau)
  return new Uint8Array(out);
}

// ---------- HTML (cetak biasa / PDF) ----------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function receiptHtml(d: ReceiptData, paper: Paper): string {
  if (paper !== "a4") {
    const cols = PAPER_COLS[paper];
    const body = layoutText(d, cols).map((r) => {
      const cls = [r.b ? "b" : "", r.big ? "big" : "", r.c ? "c" : ""].filter(Boolean).join(" ");
      return `<div${cls ? ` class="${cls}"` : ""}>${esc(r.c ? r.t.trim() : r.t) || "&nbsp;"}</div>`;
    }).join("");
    const mm = paper === "58" ? 58 : 80;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>
@page{size:${mm}mm auto;margin:0}
html,body{margin:0;background:#fff;color:#000}
.r{width:${mm - 6}mm;margin:0 auto;padding:3mm 0 8mm;font:${paper === "58" ? "8.6pt" : "8.8pt"}/1.25 "Courier New",ui-monospace,monospace;white-space:pre}
.b{font-weight:700}.c{text-align:center}.big{font-size:1.35em;line-height:1.3}
</style></head><body><div class="r">${body}</div></body></html>`;
  }
  const total = d.lines.reduce((s, l) => s + l.qty, 0);
  const meta = [["No", d.number], ["Tanggal", d.date], ...d.meta].map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>: ${esc(v || "-")}</td></tr>`).join("");
  const rows = d.lines.map((l, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(l.name)}</b>${l.code ? `<br><span class="m">${esc(l.code)}</span>` : ""}${l.note ? `<br><span class="m">${esc(l.note)}</span>` : ""}</td><td>${esc(l.location ?? "")}</td><td class="q">${esc(fmtQty(l.qty))}</td><td>${esc(l.unit ?? "")}</td><td class="ck"></td></tr>`).join("");
  const signs = d.signs.map((s) => `<div class="s"><div>${esc(s)}</div><div class="line"></div></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>
@page{size:A4 portrait;margin:14mm}
*{box-sizing:border-box}body{margin:0;font:10pt/1.4 Arial,Helvetica,sans-serif;color:#111}
.h{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:8px}
.h h1{margin:0;font-size:16pt}.h p{margin:2px 0 0;color:#444;font-size:9pt}
.t{text-align:right}.t h2{margin:0;font-size:13pt;letter-spacing:.5px}
.void{color:#c00;font-weight:700;margin-top:4px}
.meta{margin:10px 0 12px;border-collapse:collapse}.meta td{padding:1px 8px 1px 0}.meta .k{color:#555}
table.i{width:100%;border-collapse:collapse}table.i th,table.i td{border:1px solid #999;padding:5px 6px;vertical-align:top}
table.i th{background:#f0f0f0;text-align:left;font-size:9pt}.n{width:26px;text-align:center}.q{text-align:right;font-weight:700;width:60px}.ck{width:46px}
.m{color:#666;font-size:8.5pt}.tot td{font-weight:700;background:#fafafa}
.notes{margin-top:10px}.sg{display:flex;justify-content:space-around;margin-top:28px;page-break-inside:avoid}
.s{text-align:center;min-width:150px}.s .line{margin:62px auto 0;width:170px;border-top:1px solid #333}
.f{white-space:pre-line;margin-top:24px;color:#777;font-size:8pt;text-align:center}
</style></head><body>
<div class="h"><div><h1>${esc(d.company.name)}</h1>${d.company.address ? `<p>${esc(d.company.address)}</p>` : ""}${d.company.phone ? `<p>Telp ${esc(d.company.phone)}</p>` : ""}</div>
<div class="t"><h2>${esc(d.title)}</h2>${d.voided ? `<div class="void">DIBATALKAN</div>` : ""}</div></div>
<table class="meta">${meta}</table>
<table class="i"><thead><tr><th class="n">No</th><th>Barang</th><th>Lokasi simpan</th><th class="q">Qty</th><th>Satuan</th><th class="ck">Cek</th></tr></thead>
<tbody>${rows}<tr class="tot"><td></td><td colspan="2">Total ${d.lines.length} barang</td><td class="q">${esc(fmtQty(total))}</td><td colspan="2"></td></tr></tbody></table>
${d.notes ? `<div class="notes"><b>Keterangan:</b> ${esc(d.notes)}</div>` : ""}
<div class="sg">${signs}</div>
<div class="f">${esc(d.footer)}</div>
</body></html>`;
}

/** Cetak HTML lewat iframe tersembunyi (dialog print bawaan: printer, PDF, atau aplikasi printer thermal). */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const doc = f.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    let done = false;
    const cleanup = () => { if (done) return; done = true; setTimeout(() => f.remove(), 500); resolve(); };
    f.contentWindow!.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      try { f.contentWindow!.focus(); f.contentWindow!.print(); } catch { cleanup(); }
      setTimeout(cleanup, 120000);
    }, 300);
  });
}

export { fmtDate, fmtDateTime };

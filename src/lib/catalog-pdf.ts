/**
 * Katalog PDF bergaya brosur, ukuran A4 (siap cetak skala 100%).
 * Lapisan gambar (latar, lingkaran, foto) digambar di canvas lalu disisipkan sebagai JPEG;
 * teks & kartu digambar sebagai vektor dengan font tertanam (Bebas Neue + Poppins), jadi tajam saat dicetak.
 */
import type { jsPDF as JsPDF } from "jspdf";
import { fmtDate, fmtRp, todayISO } from "./format";
import { stockText, type CatalogEntry, type CatalogOptions } from "./catalog";

type RGB = [number, number, number];
export type ThemeId = "oranye" | "hijau" | "biru" | "gelap";
export type Layout = "showcase" | "grid" | "list";

interface Theme { label: string; bg: [string, string]; circle: [string, string]; card: RGB; pill: RGB; accent: RGB; swatch: string }
export const THEMES: Record<ThemeId, Theme> = {
  oranye: { label: "Oranye", bg: ["#F29A4E", "#E0523E"], circle: ["#55A9E6", "#2F6FC0"], card: [192, 76, 44], pill: [196, 232, 120], accent: [47, 111, 192], swatch: "linear-gradient(135deg,#F29A4E,#E0523E)" },
  hijau: { label: "Hijau", bg: ["#22A98B", "#0B5E4D"], circle: ["#F7C04A", "#E58A1A"], card: [9, 78, 64], pill: [168, 240, 214], accent: [229, 138, 26], swatch: "linear-gradient(135deg,#22A98B,#0B5E4D)" },
  biru: { label: "Biru", bg: ["#3F8CF5", "#1C3D9E"], circle: ["#FDBA4D", "#F2761B"], card: [24, 52, 140], pill: [176, 208, 255], accent: [242, 118, 27], swatch: "linear-gradient(135deg,#3F8CF5,#1C3D9E)" },
  gelap: { label: "Gelap", bg: ["#343A44", "#121519"], circle: ["#F29A4E", "#E0523E"], card: [30, 34, 40], pill: [242, 154, 78], accent: [224, 82, 62], swatch: "linear-gradient(135deg,#343A44,#121519)" },
};

export interface DesignOptions { layout: Layout; theme: ThemeId; inkSaver: boolean; cover: boolean }

const WHITE: RGB = [255, 255, 255];
const INK: RGB = [24, 28, 33];
const MUTED: RGB = [102, 112, 133];
const PX = 6; // piksel canvas per mm (±152 dpi)

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as RGB;
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* ---------------- font ---------------- */
const FONT_FILES = { bebas: "/fonts/BebasNeue_400Regular.ttf", reg: "/fonts/Poppins_400Regular.ttf", semi: "/fonts/Poppins_600SemiBold.ttf" };
let fontCache: Promise<Record<keyof typeof FONT_FILES, string> | null> | null = null;
function loadFonts() {
  fontCache ??= (async () => {
    try {
      const out = {} as Record<keyof typeof FONT_FILES, string>;
      for (const [k, url] of Object.entries(FONT_FILES) as [keyof typeof FONT_FILES, string][]) {
        const res = await fetch(url);
        if (!res.ok) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        out[k] = btoa(bin);
      }
      return out;
    } catch { return null; }
  })();
  return fontCache;
}

class Fonts {
  ok = false;
  constructor(private doc: JsPDF) {}
  async init() {
    const f = await loadFonts();
    if (!f) return;
    this.doc.addFileToVFS("Bebas.ttf", f.bebas); this.doc.addFont("Bebas.ttf", "Bebas", "normal");
    this.doc.addFileToVFS("Pop.ttf", f.reg); this.doc.addFont("Pop.ttf", "Poppins", "normal");
    this.doc.addFileToVFS("PopSemi.ttf", f.semi); this.doc.addFont("PopSemi.ttf", "Poppins", "bold");
    this.ok = true;
  }
  title(pt: number) { this.doc.setFont(this.ok ? "Bebas" : "helvetica", this.ok ? "normal" : "bold"); this.doc.setFontSize(pt); }
  body(pt: number, bold = false) { this.doc.setFont(this.ok ? "Poppins" : "helvetica", bold ? "bold" : "normal"); this.doc.setFontSize(pt); }
}

/* ---------------- gambar ---------------- */
const bmpCache = new Map<string, Promise<ImageBitmap | null>>();
function loadBitmap(url: string) {
  if (!bmpCache.has(url)) bmpCache.set(url, (async () => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return null;
      return await createImageBitmap(await res.blob());
    } catch { return null; }
  })());
  return bmpCache.get(url)!;
}

/**
 * Hapus latar putih/terang yang menyambung ke tepi foto (seperti foto produk studio),
 * supaya produk tampil "melayang" di atas lingkaran. Kembali null bila latarnya tidak polos.
 */
const cutCache = new Map<string, HTMLCanvasElement | null>();
function cutout(bmp: ImageBitmap, key: string, max = 900): HTMLCanvasElement | null {
  if (cutCache.has(key)) return cutCache.get(key)!;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // warna latar = median piksel tepi; harus terang & polos
  const ring: number[] = [];
  for (let x = 0; x < w; x++) ring.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) ring.push(y * w, y * w + w - 1);
  const med = (k: number) => { const v = ring.map((p) => d[p * 4 + k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  if (bg[0] + bg[1] + bg[2] < 600) { cutCache.set(key, null); return null; }
  const light = (i: number) => Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) < 36;
  const edge = ring.filter((p) => light(p * 4));
  if (edge.length / ring.length < 0.82) { cutCache.set(key, null); return null; }
  const removed = new Uint8Array(w * h);
  const stack = edge;
  for (const p of edge) removed[p] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w, y = (p - x) / w;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of nb) if (q >= 0 && !removed[q] && light(q * 4)) { removed[q] = 1; stack.push(q); }
  }
  let count = 0;
  for (let p = 0; p < w * h; p++) count += removed[p];
  if (count / (w * h) > 0.93 || count / (w * h) < 0.05) { cutCache.set(key, null); return null; }
  // tepi halus: alpha = rata-rata 3x3 dari piksel yang dipertahankan
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (removed[p]) { d[p * 4 + 3] = 0; continue; }
    let keep = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      n++; keep += removed[yy * w + xx] ? 0 : 1;
    }
    if (keep < n) d[p * 4 + 3] = Math.round(255 * (0.35 + 0.65 * keep / n));
  }
  ctx.putImageData(img, 0, 0);
  // potong ke batas produk supaya produk tampil sebesar mungkin
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0 || y1 <= y0) { cutCache.set(key, null); return null; }
  const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  cutCache.set(key, out);
  return out;
}

function canvas(wMm: number, hMm: number) {
  const c = document.createElement("canvas");
  c.width = Math.round(wMm * PX); c.height = Math.round(hMm * PX);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(PX, PX); // gambar dalam satuan mm
  return { c, ctx };
}
const jpeg = (c: HTMLCanvasElement, q = 0.86) => c.toDataURL("image/jpeg", q);

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: Theme, ink: boolean) {
  if (ink) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const a = hex(t.bg[1]);
    ctx.strokeStyle = css(a, 0.35); ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(W * 0.52, H); ctx.lineTo(W, H * 0.58); ctx.stroke();
    ctx.fillStyle = css(a, 0.07);
    ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.lineTo(W * 0.26, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // bidang & garis dekoratif
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.beginPath(); ctx.moveTo(0, H * 0.58); ctx.lineTo(W * 0.34, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath(); ctx.moveTo(W * 0.62, H); ctx.lineTo(W, H * 0.42); ctx.lineTo(W, H * 0.66); ctx.lineTo(W * 0.8, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(-2, H * 0.5); ctx.bezierCurveTo(W * 0.08, H * 0.62, W * 0.16, H * 0.88, W * 0.23, H + 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.5, H + 1); ctx.lineTo(W + 1, H * 0.36); ctx.stroke();
}

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: Theme, ink: boolean) {
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (ink) { const c = hex(t.bg[1]); g.addColorStop(0, css(mix(c, WHITE, 0.86))); g.addColorStop(1, css(mix(c, WHITE, 0.74))); }
  else { g.addColorStop(0, t.circle[0]); g.addColorStop(1, t.circle[1]); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Gambar produk di dalam kotak (mm). Tanpa latar: melayang + bayangan; ada latar: kartu putih membulat. */
async function drawProduct(ctx: CanvasRenderingContext2D, url: string | undefined, x: number, y: number, size: number, fallbackLabel = true) {
  const bmp = url ? await loadBitmap(url) : null;
  if (!bmp) {
    if (fallbackLabel) { ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `600 ${size * 0.07}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("Tanpa foto", x + size / 2, y + size / 2); }
    return;
  }
  const cut = cutout(bmp, url!);
  ctx.save();
  if (cut) {
    const s = Math.min(size / cut.width, size / cut.height);
    const w = cut.width * s, h = cut.height * s;
    ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = size * 0.06 * PX; ctx.shadowOffsetY = size * 0.03 * PX;
    ctx.drawImage(cut, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    const box = size * 0.74, bx = x + (size - box) / 2, by = y + (size - box) / 2;
    ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = size * 0.05 * PX; ctx.shadowOffsetY = size * 0.02 * PX;
    roundRectPath(ctx, bx, by, box, box, box * 0.08); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.shadowColor = "transparent";
    const pad = box * 0.06, inner = box - 2 * pad;
    const s = Math.min(inner / bmp.width, inner / bmp.height);
    const w = bmp.width * s, h = bmp.height * s;
    ctx.save(); roundRectPath(ctx, bx, by, box, box, box * 0.08); ctx.clip();
    ctx.drawImage(bmp, bx + pad + (inner - w) / 2, by + pad + (inner - h) / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** Foto kecil dalam kartu putih (untuk foto tambahan & daftar harga). */
async function drawThumb(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, s: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)"; ctx.shadowBlur = 1.2 * PX; ctx.shadowOffsetY = 0.4 * PX;
  roundRectPath(ctx, x, y, s, s, s * 0.14); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
  const bmp = await loadBitmap(url);
  if (!bmp) return;
  const pad = s * 0.08, inner = s - 2 * pad, k = Math.min(inner / bmp.width, inner / bmp.height);
  ctx.drawImage(bmp, x + pad + (inner - bmp.width * k) / 2, y + pad + (inner - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
}

/* ---------------- isi barang ---------------- */
interface Spec { label: string; value: string }
/** Baris "Label: isi" di deskripsi jadi tabel spesifikasi; sisanya jadi paragraf. */
export function parseDescription(desc: string | null | undefined): { specs: Spec[]; text: string } {
  const specs: Spec[] = []; const rest: string[] = [];
  for (const raw of (desc ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^[-•*]?\s*([^:]{1,28}?)\s*:\s*(.+)$/);
    if (m) specs.push({ label: m[1], value: m[2] }); else rest.push(line);
  }
  return { specs, text: rest.join(" ") };
}

function entrySpecs(e: CatalogEntry, o: CatalogOptions) {
  const { specs, text } = parseDescription(e.description);
  const rows = [...specs];
  if (o.showCode && e.code) rows.unshift({ label: "Kode", value: e.code });
  if (e.unit && !rows.some((r) => /satuan/i.test(r.label))) rows.push({ label: "Satuan", value: e.unit });
  return { rows: rows.slice(0, 9), text };
}

function groupBy(entries: CatalogEntry[]) {
  const m = new Map<string, CatalogEntry[]>();
  for (const e of entries) { if (!m.has(e.group)) m.set(e.group, []); m.get(e.group)!.push(e); }
  return [...m.entries()].sort((a, b) => (a[0] || "~").localeCompare(b[0] || "~"));
}

/* ---------------- pembangun PDF ---------------- */
export async function buildDesignedCatalog(entries: CatalogEntry[], o: CatalogOptions, d: DesignOptions, onProgress?: (done: number, total: number) => void) {
  const { jsPDF } = await import("jspdf");
  const landscape = d.layout === "showcase";
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait", compress: true });
  doc.setProperties({ title: o.title || `Katalog ${o.company}`, creator: "Smart Stock", subject: "Katalog produk" });
  const F = new Fonts(doc); await F.init();
  const t = THEMES[d.theme];
  const ink = d.inkSaver;
  const W = landscape ? 297 : 210, H = landscape ? 210 : 297, M = 14;
  const fg: RGB = ink ? INK : WHITE;
  const fgMuted: RGB = ink ? MUTED : mix(WHITE, hex(t.bg[1]), 0.22);
  const titleColor: RGB = ink ? hex(t.bg[1]) : WHITE;
  const groups = groupBy(entries);
  let first = true;
  const newPage = () => { if (!first) doc.addPage("a4", landscape ? "landscape" : "portrait"); first = false; };
  const total = entries.length;
  let done = 0;

  // latar polos (tanpa foto) dipakai ulang di semua halaman: cukup sekali disimpan di PDF
  const bgAlias = `bg-${d.theme}-${ink ? "ink" : "full"}-${landscape ? "l" : "p"}`;
  let bgData: string | null = null;
  const plainBg = () => {
    if (!bgData) { const { c, ctx } = canvas(W, H); drawBackground(ctx, W, H, t, ink); bgData = jpeg(c, 0.88); }
    doc.addImage(bgData, "JPEG", 0, 0, W, H, bgAlias, "FAST");
  };

  const pillWidth = (text: string) => { F.body(9.5, true); const label = text.toUpperCase(); return doc.getTextWidth(label) + label.length * 0.9 + 10; };
  const pill = (text: string, x: number, y: number) => {
    const w = pillWidth(text);
    F.body(9.5, true);
    const label = text.toUpperCase();
    doc.setLineWidth(0.6); doc.setDrawColor(...(ink ? hex(t.bg[1]) : t.pill));
    doc.roundedRect(x, y, w, 9, 4.5, 4.5, "S");
    doc.setTextColor(...(ink ? hex(t.bg[1]) : WHITE));
    doc.text(label, x + 5, y + 6.1, { charSpace: 0.9 });
    return w;
  };
  const footer = (page: number) => {
    F.body(8);
    doc.setTextColor(...fgMuted);
    const left = [o.contact.trim() ? `Pemesanan: ${o.contact.trim()}` : o.company, fmtDate(todayISO())].join("  ·  ");
    doc.text(left, M, H - 7);
    doc.text(`${page}`, W - M, H - 7, { align: "right" });
  };

  /* ---------- sampul ---------- */
  if (d.cover) {
    newPage();
    const { c, ctx } = canvas(W, H);
    drawBackground(ctx, W, H, t, ink);
    const sq = landscape ? 104 : 120, cx = W / 2, cy = landscape ? H * 0.5 : H * 0.42;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.21);
    ctx.strokeStyle = ink ? css(hex(t.bg[1]), 0.5) : "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.5;
    roundRectPath(ctx, -sq / 2 + 9, -sq / 2 - 9, sq, sq, 14); ctx.stroke();
    ctx.fillStyle = ink ? css(mix(hex(t.bg[1]), WHITE, 0.82)) : "rgba(0,0,0,0.10)";
    roundRectPath(ctx, -sq / 2 - 8, -sq / 2 + 8, sq, sq, 14); ctx.fill();
    const g = ctx.createLinearGradient(-sq / 2, -sq / 2, sq / 2, sq / 2);
    if (ink) { g.addColorStop(0, css(hex(t.bg[0]))); g.addColorStop(1, css(hex(t.bg[1]))); } else { g.addColorStop(0, t.circle[0]); g.addColorStop(1, t.circle[1]); }
    ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 4 * PX; ctx.shadowOffsetY = 1.5 * PX;
    ctx.fillStyle = g; roundRectPath(ctx, -sq / 2, -sq / 2, sq, sq, 14); ctx.fill();
    ctx.restore();
    doc.addImage(jpeg(c, 0.88), "JPEG", 0, 0, W, H, undefined, "FAST");
    // judul di tengah persegi
    const title = (o.title || `Katalog ${o.company}`).toUpperCase();
    let size = 44, lines: string[] = [];
    for (; size >= 22; size -= 2) { F.title(size); lines = doc.splitTextToSize(title, sq * 0.82) as string[]; if (lines.length <= 4) break; }
    const lh = size * 0.3528 * 0.98;
    let ty = cy - (lines.length * lh) / 2 + lh * 0.78;
    doc.setTextColor(...WHITE);
    for (const l of lines.slice(0, 5)) { doc.text(l, cx, ty, { align: "center" }); ty += lh; }
    F.body(15, true); doc.setTextColor(...fg); doc.text(o.company.toUpperCase(), M, M + 6, { charSpace: 0.6 });
    pill(`${entries.length} produk`, W - M - pillWidth(`${entries.length} produk`), M);
    F.body(9.5); doc.setTextColor(...fgMuted);
    const gnames = groups.map(([g]) => g || "Lainnya");
    const info = [gnames.length > 1 ? gnames.slice(0, 8).join("  ·  ") + (gnames.length > 8 ? "  ·  …" : "") : null, o.note.trim() || null].filter(Boolean) as string[];
    let iy = H - 30;
    for (const line of info) { for (const l of (doc.splitTextToSize(line, W - 2 * M) as string[]).slice(0, 2)) { doc.text(l, M, iy); iy += 4.6; } }
    footer(1);
  }

  /* ---------- 1 barang per halaman (lanskap) ---------- */
  if (d.layout === "showcase") {
    let page = d.cover ? 1 : 0;
    for (const [g, list] of groups) {
      if (groups.length > 1) {
        // halaman pembatas grup
        newPage(); page++; plainBg();
        F.title(64); doc.setTextColor(...titleColor);
        const lines = (doc.splitTextToSize((g || "Lainnya").toUpperCase(), W - 2 * M - 40) as string[]).slice(0, 2);
        let y = H / 2 - (lines.length - 1) * 11;
        for (const l of lines) { doc.text(l, M + 6, y); y += 22; }
        doc.setDrawColor(...(ink ? hex(t.bg[1]) : WHITE)); doc.setLineWidth(1.2); doc.line(M + 6, y - 14, M + 46, y - 14);
        F.body(12); doc.setTextColor(...fgMuted); doc.text(`${list.length} produk`, M + 6, y - 6);
        pill(o.company, M, 12); footer(page);
      }
      for (const e of list) {
        newPage(); page++;
        const { c, ctx } = canvas(W, H);
        drawBackground(ctx, W, H, t, ink);
        const cx = 80, cy = 112, r = 60;
        if (o.photos !== "none") {
          drawCircle(ctx, cx, cy, r, t, ink);
          await drawProduct(ctx, e.photos[0], cx - 49, cy - 54, 98);
          if (o.photos === "all" && e.photos.length > 1) {
            const extra = e.photos.slice(1, 5), s = 19, gap = 4;
            const x0 = cx - (extra.length * s + (extra.length - 1) * gap) / 2;
            for (let k = 0; k < extra.length; k++) await drawThumb(ctx, extra[k], x0 + k * (s + gap), H - 32, s);
          }
        }
        doc.addImage(jpeg(c), "JPEG", 0, 0, W, H, undefined, "FAST");
        pill(o.company, M, 12);

        // kartu info
        const { rows, text } = entrySpecs(e, o);
        const cardX = o.photos === "none" ? 40 : 150, cardW = o.photos === "none" ? W - 80 : 133, pad = 12;
        const inner = cardW - 2 * pad;
        // judul: perkecil sampai muat maks 3 baris
        let size = 46, tl: string[] = [];
        for (; size >= 22; size -= 2) { F.title(size); tl = doc.splitTextToSize(e.name.toUpperCase(), inner) as string[]; if (tl.length <= 3) break; }
        tl = tl.slice(0, 3);
        const lh = size * 0.3528 * 0.95;
        F.body(10.5);
        const labelW = rows.length ? Math.min(42, Math.max(...rows.map((r) => doc.getTextWidth(r.label))) + 4) : 0;
        const rowLines = rows.map((r) => (doc.splitTextToSize(`: ${r.value}`, inner - labelW) as string[]).slice(0, 2));
        const specH = rowLines.reduce((s, l) => s + l.length * 4.9, 0);
        const textLines = text ? (doc.splitTextToSize(text, inner) as string[]).slice(0, 4) : [];
        const st = stockText(e, o.stock);
        const priceH = o.showPrice && e.price !== null ? 18 : 0;
        const cardH = Math.min(H - 52, pad + (e.group ? 7 : 0) + tl.length * lh + 5 + specH + (textLines.length ? textLines.length * 4.6 + 3 : 0) + (st ? 8 : 0) + priceH + pad);
        const cardY = Math.max(30, (H - cardH) / 2 + 4);
        doc.setLineWidth(0.9);
        if (ink) { doc.setDrawColor(...hex(t.bg[1])); doc.setFillColor(...WHITE); }
        else { doc.setDrawColor(...mix(WHITE, t.card, 0.12)); doc.setFillColor(...t.card); }
        doc.roundedRect(cardX, cardY, cardW, cardH, 10, 10, "FD");
        let y = cardY + pad;
        if (e.group) { F.body(8.5, true); doc.setTextColor(...(ink ? hex(t.bg[1]) : mix(WHITE, t.card, 0.3))); doc.text(e.group.toUpperCase(), cardX + pad, y + 3, { charSpace: 0.7 }); y += 7; }
        F.title(size); doc.setTextColor(...(ink ? INK : WHITE));
        for (const l of tl) { y += lh; doc.text(l, cardX + pad, y - lh * 0.12); }
        y += 5;
        F.body(10.5);
        rows.forEach((r, i) => {
          doc.setTextColor(...(ink ? MUTED : mix(WHITE, t.card, 0.12)));
          doc.text(r.label, cardX + pad, y + 3.6);
          doc.setTextColor(...(ink ? INK : WHITE));
          rowLines[i].forEach((l, k) => doc.text(k ? `  ${l}` : l, cardX + pad + labelW, y + 3.6 + k * 4.9));
          y += rowLines[i].length * 4.9;
        });
        if (textLines.length) { y += 3; F.body(9.5); doc.setTextColor(...(ink ? MUTED : mix(WHITE, t.card, 0.18))); for (const l of textLines) { doc.text(l, cardX + pad, y + 3.4); y += 4.6; } }
        if (st) {
          y += 3; F.body(9, true);
          const w = doc.getTextWidth(st) + 8;
          const out = e.qty <= 0;
          doc.setFillColor(...(out ? [180, 35, 24] as RGB : ink ? mix(hex(t.bg[1]), WHITE, 0.85) : mix(t.card, WHITE, 0.16)));
          doc.roundedRect(cardX + pad, y - 1, w, 6.4, 3.2, 3.2, "F");
          doc.setTextColor(...(out ? WHITE : ink ? hex(t.bg[1]) : WHITE));
          doc.text(st, cardX + pad + 4, y + 3.4);
          y += 6;
        }
        if (priceH) {
          const py = cardY + cardH - pad - 12;
          doc.setFillColor(...(ink ? hex(t.bg[1]) : t.accent));
          F.body(17, true);
          const pt = fmtRp(e.price!);
          F.body(9); const unitW = e.unit ? doc.getTextWidth(`/ ${e.unit}`) + 2 : 0; F.body(17, true);
          const pw = doc.getTextWidth(pt) + unitW + 12;
          doc.roundedRect(cardX + pad, py, pw, 12, 6, 6, "F");
          doc.setTextColor(...WHITE); doc.text(pt, cardX + pad + 6, py + 8.4);
          if (e.unit) { F.body(9); doc.text(`/ ${e.unit}`, cardX + pad + 6 + pw - 12 - unitW + 2, py + 8.2); }
        }
        footer(page);
        onProgress?.(++done, total);
      }
    }
  }

  /* ---------- grid 2 kolom (potret), mengalir antar grup ---------- */
  if (d.layout === "grid") {
    let page = d.cover ? 1 : 0;
    const cols = 2, gap = 6, top = 34, bottom = 14;
    const cw = (W - 2 * M - gap) / cols, ch = 80;
    const photoH = o.photos === "none" ? 0 : 44;
    const cardFill: RGB = ink ? WHITE : t.card;
    let y = 0;
    const head = () => {
      if (page > 0) footer(page);
      newPage(); page++; plainBg();
      pill(o.company, M, 11);
      F.title(26); doc.setTextColor(...titleColor);
      doc.text((o.title || o.company).toUpperCase(), M, 29);
      y = top + 2;
    };
    head();
    for (const [g, list] of groups) {
      if (groups.length > 1) {
        if (y + 11 + ch > H - bottom) head();
        F.title(18); doc.setTextColor(...titleColor); doc.text((g || "Lainnya").toUpperCase(), M, y + 6.5);
        doc.setDrawColor(...(ink ? hex(t.bg[1]) : WHITE)); doc.setLineWidth(0.5); doc.line(M, y + 8.5, M + 24, y + 8.5);
        y += 12;
      }
      for (let i = 0; i < list.length; i += cols) {
        if (y + ch > H - bottom) head();
        for (let k = 0; k < cols && i + k < list.length; k++) {
          const e = list[i + k];
          const x = M + k * (cw + gap);
          doc.setLineWidth(0.7);
          if (ink) doc.setDrawColor(...hex(t.bg[1])); else doc.setDrawColor(...mix(WHITE, t.card, 0.12));
          doc.setFillColor(...cardFill);
          doc.roundedRect(x, y, cw, ch, 6, 6, "FD");
          if (photoH) {
            // ubin foto berlatar warna kartu, jadi cukup JPEG
            const tw = cw - 12, th = photoH;
            const { c, ctx } = canvas(tw, th);
            ctx.fillStyle = css(cardFill); ctx.fillRect(0, 0, tw, th);
            drawCircle(ctx, tw / 2, th / 2, th * 0.47, t, ink);
            await drawProduct(ctx, e.photos[0], tw / 2 - th * 0.39, th * 0.11, th * 0.78, false);
            doc.addImage(jpeg(c, 0.9), "JPEG", x + 6, y + 4, tw, th, undefined, "FAST");
          }
          let ty = y + 4 + photoH + 2;
          F.title(19); doc.setTextColor(...(ink ? INK : WHITE));
          let nl = doc.splitTextToSize(e.name.toUpperCase(), cw - 10) as string[];
          if (nl.length > 2) { F.title(16); nl = (doc.splitTextToSize(e.name.toUpperCase(), cw - 10) as string[]).slice(0, 2); }
          for (const l of nl) { ty += 6.4; doc.text(l, x + 5, ty); }
          F.body(8); doc.setTextColor(...(ink ? MUTED : mix(WHITE, t.card, 0.18)));
          const meta = [o.showCode ? e.code : null, stockText(e, o.stock)].filter(Boolean).join("  ·  ");
          if (meta) { ty += 4.6; doc.text((doc.splitTextToSize(meta, cw - 10) as string[])[0], x + 5, ty); }
          const { rows: specs } = entrySpecs({ ...e, code: null }, { ...o, showCode: false });
          F.body(7.5);
          const room = Math.max(0, Math.floor((y + ch - (o.showPrice ? 12 : 4) - ty - 1) / 3.8));
          for (const sp of specs.filter((r) => r.label !== "Satuan").slice(0, room)) {
            ty += 3.8; doc.text((doc.splitTextToSize(`${sp.label}: ${sp.value}`, cw - 10) as string[])[0], x + 5, ty);
          }
          if (o.showPrice && e.price !== null) {
            F.body(12, true); doc.setTextColor(...(ink ? hex(t.bg[1]) : WHITE));
            doc.text(fmtRp(e.price), x + 5, y + ch - 5);
            if (e.unit) { const w = doc.getTextWidth(fmtRp(e.price)); F.body(7.5); doc.text(` / ${e.unit}`, x + 5 + w + 1, y + ch - 5); }
          }
          onProgress?.(++done, total);
        }
        y += ch + gap;
      }
    }
    footer(page);
  }

  /* ---------- daftar harga (potret, hemat halaman) ---------- */
  if (d.layout === "list") {
    let page = d.cover ? 1 : 0;
    const band = 30, rowH = o.photos === "none" ? 8.5 : 15, thumb = rowH - 3;
    const bandAlias = `band-${d.theme}-${ink ? "ink" : "full"}`;
    let bandData: string | null = null;
    let y = 0;
    const head = () => {
      newPage(); page++;
      if (!bandData) {
        const { c, ctx } = canvas(W, band);
        if (ink) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, band); ctx.fillStyle = css(hex(t.bg[1])); ctx.fillRect(0, band - 1.2, W, 1.2); }
        else drawBackground(ctx, W, band, t, false);
        bandData = jpeg(c, 0.88);
      }
      doc.addImage(bandData, "JPEG", 0, 0, W, band, bandAlias, "FAST");
      pill(o.company, M, 7);
      F.title(22); doc.setTextColor(...(ink ? hex(t.bg[1]) : WHITE));
      doc.text((o.title || o.company).toUpperCase(), M, 25.5);
      y = band + 9;
      F.body(7.5, true); doc.setTextColor(...MUTED);
      const nameX = M + (o.photos === "none" ? 8 : thumb + 4);
      doc.text("NO", M, y); doc.text("NAMA BARANG", nameX, y);
      if (o.showCode) doc.text("KODE", 128, y);
      if (o.stock !== "none") doc.text("STOK", 156, y);
      if (o.showPrice) doc.text("HARGA", W - M, y, { align: "right" });
      y += 2.5; doc.setDrawColor(220, 227, 223); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 1;
    };
    head();
    let no = 0;
    for (const [g, list] of groups) {
      if (groups.length > 1) {
        if (y + 8 + rowH > H - 14) head();
        F.title(15); doc.setTextColor(...hex(t.bg[1])); doc.text((g || "Lainnya").toUpperCase(), M, y + 7); y += 10;
      }
      for (const e of list) {
        if (y + rowH > H - 14) { footer(page); head(); }
        no++;
        if (no % 2 === 0) { doc.setFillColor(247, 248, 250); doc.rect(M - 2, y, W - 2 * M + 4, rowH, "F"); }
        let nameX = M + 8;
        if (o.photos !== "none") {
          const { c, ctx } = canvas(thumb, thumb);
          ctx.fillStyle = no % 2 === 0 ? "#F7F8FA" : "#fff"; ctx.fillRect(0, 0, thumb, thumb);
          if (e.photos[0]) await drawThumb(ctx, e.photos[0], 0.4, 0.4, thumb - 0.8);
          doc.addImage(jpeg(c, 0.82), "JPEG", M + 6.5, y + 1.5, thumb, thumb, undefined, "FAST");
          nameX = M + 6.5 + thumb + 3;
        }
        const mid = y + rowH / 2 + 1.3;
        F.body(8.5); doc.setTextColor(...MUTED); doc.text(String(no), M, mid);
        F.body(9.5, true); doc.setTextColor(...INK);
        const nameW = (o.showCode ? 126 : o.stock !== "none" ? 154 : W - M - 40) - nameX;
        doc.text((doc.splitTextToSize(e.name, nameW) as string[])[0], nameX, mid);
        F.body(8.5); doc.setTextColor(...MUTED);
        if (o.showCode && e.code) doc.text((doc.splitTextToSize(e.code, 26) as string[])[0], 128, mid);
        if (o.stock !== "none") { const s = stockText(e, o.stock).replace(/^Stok /, ""); doc.setTextColor(...(e.qty <= 0 ? [180, 35, 24] as RGB : MUTED)); doc.text(s, 156, mid); }
        if (o.showPrice && e.price !== null) { F.body(9.5, true); doc.setTextColor(...INK); doc.text(fmtRp(e.price), W - M, mid, { align: "right" }); }
        y += rowH;
        onProgress?.(++done, total);
      }
    }
    footer(page);
    if (o.note.trim()) {
      F.body(8.5); doc.setTextColor(...MUTED);
      const lines = (doc.splitTextToSize(o.note.trim(), W - 2 * M) as string[]).slice(0, 3);
      if (y + 6 + lines.length * 4 > H - 14) { head(); }
      y += 6; for (const l of lines) { doc.text(l, M, y); y += 4; }
    }
  }

  return doc;
}

/**
 * Label barcode: template ukuran, encoding (CODE128 / EAN-13) dan tata letak.
 * Tata letak dihitung dalam milimeter sebagai daftar bentuk (bar & teks), lalu
 * digambar ke PDF (vektor, tajam di printer thermal 203/300 dpi) atau ke SVG pratinjau.
 */
import JsBarcode from "jsbarcode";

export type LabelKind = "thermal" | "sheet";

export interface LabelTemplate {
  id: string;
  kind: LabelKind;
  name: string;
  desc: string;
  /** ukuran satu label (mm) */
  w: number;
  h: number;
  /** khusus lembar A4 */
  cols?: number;
  rows?: number;
  marginTop?: number;
  marginLeft?: number;
  gapX?: number;
  gapY?: number;
}

export const TEMPLATES: LabelTemplate[] = [
  { id: "t33x15x3", kind: "thermal", name: "Thermal 33 × 15 mm · 3 kolom", desc: "Roll 3 baris (lebar ±105 mm), label kecil barang", w: 33, h: 15, cols: 3, gapX: 3, marginLeft: 0 },
  { id: "t50x30", kind: "thermal", name: "Thermal 50 × 30 mm", desc: "Paling umum untuk barang gudang", w: 50, h: 30 },
  { id: "t40x30", kind: "thermal", name: "Thermal 40 × 30 mm", desc: "Label sedang", w: 40, h: 30 },
  { id: "t58x40", kind: "thermal", name: "Thermal 58 × 40 mm", desc: "Roll 58 mm, teks lebih besar", w: 58, h: 40 },
  { id: "t33x15", kind: "thermal", name: "Thermal 33 × 15 mm", desc: "Roll 1 kolom", w: 33, h: 15 },
  { id: "t100x50", kind: "thermal", name: "Thermal 100 × 50 mm", desc: "Label rak / kardus", w: 100, h: 50 },
  { id: "a4-3x8", kind: "sheet", name: "A4 · 24 label (3 × 8)", desc: "70 × 37 mm per label", w: 70, h: 37.125, cols: 3, rows: 8, marginTop: 0, marginLeft: 0, gapX: 0, gapY: 0 },
  { id: "a4-4x10", kind: "sheet", name: "A4 · 40 label (4 × 10)", desc: "52,5 × 29,7 mm per label", w: 52.5, h: 29.7, cols: 4, rows: 10, marginTop: 0, marginLeft: 0, gapX: 0, gapY: 0 },
  { id: "a4-5x13", kind: "sheet", name: "A4 · 65 label (5 × 13)", desc: "38,1 × 21,2 mm per label", w: 38.1, h: 21.2, cols: 5, rows: 13, marginTop: 10.7, marginLeft: 4.65, gapX: 2.5, gapY: 0 },
  { id: "a4-2x7", kind: "sheet", name: "A4 · 14 label (2 × 7)", desc: "99,1 × 38,1 mm, label rak", w: 99.1, h: 38.1, cols: 2, rows: 7, marginTop: 15.15, marginLeft: 4.65, gapX: 2.5, gapY: 0 },
];

export interface LabelOptions {
  showName: boolean;
  showCode: boolean;
  showPrice: boolean;
  /** cetak garis tepi tipis (bantu potong di kertas A4 biasa) */
  border: boolean;
}

export interface LabelData {
  value: string;
  name: string;
  code?: string | null;
  price?: string | null;
}

export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number }
  | { t: "text"; x: number; y: number; s: number; text: string; bold?: boolean; align: "left" | "center" | "right" }
  | { t: "frame"; x: number; y: number; w: number; h: number };

const PT = 0.3528; // 1 pt dalam mm

export function isEan13(v: string) {
  if (!/^\d{13}$/.test(v)) return false;
  const sum = v.slice(0, 12).split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(v[12]);
}

/** Barcode 1D sebagai string modul '1'/'0' + jumlah modul diam (quiet zone) per sisi. */
export function encode(value: string): { bits: string; format: "EAN13" | "CODE128"; quiet: number } | null {
  const format = isEan13(value) ? "EAN13" : "CODE128";
  try {
    const out: { encodings?: { data: string }[] } = {};
    JsBarcode(out, value, { format, flat: true });
    const bits = (out.encodings ?? []).map((e) => e.data).join("");
    if (!bits) return null;
    return { bits, format, quiet: format === "EAN13" ? 9 : 10 };
  } catch {
    return null;
  }
}

/** Tata letak satu label pada posisi (ox, oy). measure(text, pt, bold) mengembalikan lebar teks dalam mm. */
export function layoutLabel(
  d: LabelData, w: number, h: number, o: LabelOptions,
  measure: (t: string, pt: number, bold?: boolean) => number, ox = 0, oy = 0,
): { shapes: Shape[]; moduleMm: number } {
  const shapes: Shape[] = [];
  const pad = Math.max(1, Math.min(2.5, h * 0.07));
  const innerW = w - pad * 2;
  let top = oy + pad;
  let bottom = oy + h - pad;
  const nameSize = Math.max(5, Math.min(11, h * 0.27));
  const smallSize = Math.max(4.5, Math.min(9, h * 0.22));

  if (o.border) shapes.push({ t: "frame", x: ox + 0.3, y: oy + 0.3, w: w - 0.6, h: h - 0.6 });

  // Nama barang (maks 2 baris bila tinggi cukup)
  if (o.showName && d.name) {
    const maxLines = h >= 24 ? 2 : 1;
    for (const line of wrap(d.name, innerW, nameSize, true, measure, maxLines)) {
      top += nameSize * PT;
      shapes.push({ t: "text", x: ox + w / 2, y: top, s: nameSize, text: line, bold: true, align: "center" });
      top += nameSize * PT * 0.18;
    }
    top += 0.6;
  }

  // Baris bawah: kode (kiri) & harga (kanan)
  const footLeft = o.showCode && d.code && d.code !== d.value ? d.code : "";
  const footRight = o.showPrice && d.price ? d.price : "";
  if (footLeft || footRight) {
    const s = footRight ? Math.max(smallSize, nameSize * 0.95) : smallSize;
    if (footLeft && footRight) {
      shapes.push({ t: "text", x: ox + pad, y: bottom, s: smallSize, text: fit(footLeft, innerW * 0.45, smallSize, false, measure), align: "left" });
      shapes.push({ t: "text", x: ox + w - pad, y: bottom, s, text: footRight, bold: true, align: "right" });
    } else {
      shapes.push({ t: "text", x: ox + w / 2, y: bottom, s, text: fit(footLeft || footRight, innerW, s, !!footRight, measure), bold: !!footRight, align: "center" });
    }
    bottom -= s * PT + 0.6;
  }

  // Teks barcode di bawah batang
  const valSize = smallSize;
  shapes.push({ t: "text", x: ox + w / 2, y: bottom, s: valSize, text: fit(d.value, innerW, valSize, false, measure), align: "center" });
  bottom -= valSize * PT + 0.5;

  // Batang barcode
  const enc = encode(d.value);
  let moduleMm = 0;
  if (enc && bottom - top > 2) {
    const modules = enc.bits.length + enc.quiet * 2;
    // bulatkan ke kelipatan titik printer thermal 203 dpi (0,125 mm) agar lebar batang konsisten saat dicetak
    const raw = innerW / modules;
    moduleMm = raw >= 0.25 ? Math.floor(raw / 0.125) * 0.125 : raw;
    const barsW = enc.bits.length * moduleMm;
    const x = ox + (w - barsW) / 2;
    const barH = Math.min(bottom - top, h * 0.55);
    const y = top + (bottom - top - barH) / 2;
    let run = 0;
    for (let i = 0; i <= enc.bits.length; i++) {
      if (enc.bits[i] === "1") run++;
      else {
        if (run) shapes.push({ t: "rect", x: x + (i - run) * moduleMm, y, w: run * moduleMm, h: barH });
        run = 0;
      }
    }
  }
  return { shapes, moduleMm };
}

function fit(t: string, maxW: number, pt: number, bold: boolean, measure: (t: string, pt: number, bold?: boolean) => number) {
  if (measure(t, pt, bold) <= maxW) return t;
  let s = t;
  while (s.length > 1 && measure(`${s}…`, pt, bold) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

function wrap(t: string, maxW: number, pt: number, bold: boolean, measure: (t: string, pt: number, bold?: boolean) => number, maxLines: number) {
  const words = t.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (measure(next, pt, bold) <= maxW) { cur = next; continue; }
    if (cur) lines.push(cur);
    cur = words[i];
    if (lines.length === maxLines - 1) {
      lines.push(fit([cur, ...words.slice(i + 1)].join(" "), maxW, pt, bold, measure));
      return lines;
    }
  }
  if (cur) lines.push(fit(cur, maxW, pt, bold, measure));
  return lines.slice(0, maxLines);
}

/** Lebar teks Helvetica (mm) lewat canvas, untuk pratinjau SVG. */
let ctx: CanvasRenderingContext2D | null = null;
export function measureCanvas(t: string, pt: number, bold?: boolean) {
  if (typeof document === "undefined") return t.length * pt * PT * 0.55;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return t.length * pt * PT * 0.55;
  ctx.font = `${bold ? "bold " : ""}${pt}px Helvetica, Arial, sans-serif`;
  return ctx.measureText(t).width * PT;
}

/** Bangun PDF: thermal = satu label per halaman; A4 = grid per lembar. */
/** Lebar halaman thermal: roll multi-kolom dicetak satu baris (semua kolom) per halaman. */
export function thermalPageWidth(w: number, cols: number, gapX: number, marginLeft: number) {
  return cols > 1 ? marginLeft * 2 + cols * w + (cols - 1) * gapX : w;
}

export async function buildPdf(labels: LabelData[], tpl: LabelTemplate, o: LabelOptions, custom?: { w: number; h: number; gapX?: number; marginLeft?: number }) {
  const { jsPDF } = await import("jspdf");
  const w = custom?.w ?? tpl.w;
  const h = custom?.h ?? tpl.h;
  const thermal = tpl.kind === "thermal";
  const cols = thermal ? tpl.cols ?? 1 : 1;
  const gapX = custom?.gapX ?? tpl.gapX ?? 0;
  const ml = custom?.marginLeft ?? tpl.marginLeft ?? 0;
  const pw = thermal ? thermalPageWidth(w, cols, gapX, ml) : 210;
  const doc = thermal
    ? new jsPDF({ unit: "mm", format: [pw, h], orientation: pw > h ? "landscape" : "portrait", compress: true })
    : new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({ title: "Label barcode Smart Stock", creator: "Smart Stock" });
  const measure = (t: string, pt: number, bold?: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(pt);
    return doc.getTextWidth(t);
  };
  const draw = (shapes: Shape[]) => {
    for (const s of shapes) {
      if (s.t === "rect") { doc.setFillColor(0, 0, 0); doc.rect(s.x, s.y, s.w, s.h, "F"); }
      else if (s.t === "frame") { doc.setDrawColor(170, 170, 170); doc.setLineWidth(0.15); doc.rect(s.x, s.y, s.w, s.h, "S"); }
      else {
        doc.setFont("helvetica", s.bold ? "bold" : "normal");
        doc.setFontSize(s.s);
        doc.setTextColor(0, 0, 0);
        doc.text(s.text, s.x, s.y, { align: s.align, baseline: "bottom" });
      }
    }
  };

  if (thermal) {
    labels.forEach((d, i) => {
      const c = i % cols;
      if (i > 0 && c === 0) doc.addPage([pw, h], pw > h ? "landscape" : "portrait");
      draw(layoutLabel(d, w, h, o, measure, cols > 1 ? ml + c * (w + gapX) : 0, 0).shapes);
    });
  } else {
    const per = (tpl.cols ?? 1) * (tpl.rows ?? 1);
    labels.forEach((d, i) => {
      const k = i % per;
      if (i > 0 && k === 0) doc.addPage("a4", "portrait");
      const c = k % (tpl.cols ?? 1);
      const r = Math.floor(k / (tpl.cols ?? 1));
      const ox = (tpl.marginLeft ?? 0) + c * (w + (tpl.gapX ?? 0));
      const oy = (tpl.marginTop ?? 0) + r * (h + (tpl.gapY ?? 0));
      draw(layoutLabel(d, w, h, o, measure, ox, oy).shapes);
    });
  }
  return doc;
}

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { IconAlert, IconCheck, IconDownload, IconSearch } from "@/components/icons";
import { Button, Card, cx, Field, Input, PageHeader, Select, Sheet, Spinner, Stepper, useToast } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { loadCatalog, qtyIn, type Catalog } from "@/lib/data";
import { fmtRp } from "@/lib/format";
import { buildPdf, encode, layoutLabel, measureCanvas, TEMPLATES, type LabelData, type LabelOptions } from "@/lib/labels";
import { errorMessage, supabase } from "@/lib/supabase";

const MAX_LABELS = 3000;
type Source = "barcode" | "code";

export default function LabelPage() {
  return <Suspense fallback={<Spinner />}><LabelEditor /></Suspense>;
}

function LabelEditor() {
  const { tenant, isOwner } = useApp();
  const whIds = useActiveWarehouseIds();
  const params = useSearchParams();
  const toast = useToast();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [q, setQ] = useState("");
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [source, setSource] = useState<Source>("barcode");
  const [tplId, setTplId] = useState(() => { try { return localStorage.getItem("ss.labelTpl") ?? "t33x15x3"; } catch { return "t33x15x3"; } });
  const [cw, setCw] = useState("50");
  const [ch, setCh] = useState("30");
  const [gap, setGap] = useState("3");
  const [shift, setShift] = useState("0");
  const [opt, setOpt] = useState<LabelOptions>({ showName: true, showCode: true, showPrice: false, border: false });
  const [busy, setBusy] = useState<"" | "print" | "save">("");
  const [fillOpen, setFillOpen] = useState(false);
  const [filling, setFilling] = useState(false);

  async function reload() {
    if (!tenant) return;
    const c = await loadCatalog(tenant.id, isOwner);
    setCat(c);
    return c;
  }

  useEffect(() => {
    if (!tenant) return;
    reload().then((c) => {
      const pre = (params.get("ids") ?? "").split(",").filter(Boolean);
      if (c && pre.length) setCopies(Object.fromEntries(pre.filter((id) => c.items.some((i) => i.id === id)).map((id) => [id, 1])));
    }).catch((e) => toast(errorMessage(e), "err"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, isOwner]);

  const tpl = TEMPLATES.find((t) => t.id === tplId) ?? TEMPLATES[0];
  useEffect(() => { try { localStorage.setItem("ss.labelTpl", tplId); } catch { /* abaikan */ } }, [tplId]);
  useEffect(() => {
    if (tpl.kind === "thermal") { setCw(String(tpl.w)); setCh(String(tpl.h)); setGap(String(tpl.gapX ?? 3)); setShift(String(tpl.marginLeft ?? 0)); }
    // label kecil: cukup nama + barcode
    if (tpl.h <= 20) setOpt((o) => ({ ...o, showCode: false, showPrice: false }));
  }, [tpl]);
  const multi = tpl.kind === "thermal" && (tpl.cols ?? 1) > 1;
  const num = (v: string, d: number, lo: number, hi: number) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const size = tpl.kind === "thermal"
    ? { w: Math.min(200, Math.max(15, Number(cw.replace(",", ".")) || tpl.w)), h: Math.min(200, Math.max(10, Number(ch.replace(",", ".")) || tpl.h)) }
    : { w: tpl.w, h: tpl.h };

  const valueOf = (it: Catalog["items"][number]) => (source === "barcode" ? it.barcode || it.code : it.code || it.barcode) || "";

  const list = useMemo(() => {
    if (!cat) return [];
    const term = q.trim().toLowerCase();
    return cat.items.filter((it) => !term || [it.name, it.code, it.barcode].some((v) => v?.toLowerCase().includes(term)));
  }, [cat, q]);

  const noBarcode = cat ? cat.items.filter((it) => !it.barcode).length : 0;
  const selected = cat ? cat.items.filter((it) => (copies[it.id] ?? 0) > 0) : [];
  const unusable = selected.filter((it) => !valueOf(it) || !encode(valueOf(it)));
  const labels: LabelData[] = useMemo(() => {
    const out: LabelData[] = [];
    for (const it of selected) {
      const v = valueOf(it);
      if (!v || !encode(v)) continue;
      const d: LabelData = {
        value: v, name: it.name, code: source === "barcode" ? it.code : it.barcode,
        price: isOwner && cat?.prices[it.id] ? fmtRp(cat.prices[it.id].sell_price) : null,
      };
      for (let i = 0; i < (copies[it.id] ?? 0); i++) out.push(d);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, copies, source, isOwner, cat]);

  const preview = labels[0] ?? (cat?.items[0] ? { value: valueOf(cat.items[0]) || "8990000000017", name: cat.items[0].name, code: cat.items[0].code, price: "Rp12.500" } : { value: "8990000000017", name: "Contoh nama barang", code: "BRG-001", price: "Rp12.500" });
  const lay = layoutLabel(preview, size.w, size.h, opt, measureCanvas);
  // < 0,25 mm per modul = kurang dari 2 titik printer 203 dpi → rawan gagal scan
  const dense = useMemo(() => {
    const seen = new Map<string, LabelData>();
    for (const d of labels) seen.set(d.value, d);
    return [...seen.values()].filter((d) => { const m = layoutLabel(d, size.w, size.h, opt, measureCanvas).moduleMm; return m > 0 && m < 0.25; }).map((d) => d.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, size.w, size.h, opt]);
  const tooDense = dense.length > 0 || (labels.length === 0 && lay.moduleMm > 0 && lay.moduleMm < 0.25);
  const perSheet = (tpl.cols ?? 1) * (tpl.rows ?? 1);
  const pages = tpl.kind === "sheet" ? Math.ceil(labels.length / perSheet) : Math.ceil(labels.length / (tpl.cols ?? 1));

  function setAll(fn: (it: Catalog["items"][number]) => number) {
    setCopies((c) => ({ ...c, ...Object.fromEntries(list.map((it) => [it.id, fn(it)])) }));
  }

  async function makePdf(mode: "print" | "save") {
    if (!labels.length) { toast("Pilih barang dulu", "err"); return; }
    if (labels.length > MAX_LABELS) { toast(`Maksimal ${MAX_LABELS} label sekali cetak`, "err"); return; }
    setBusy(mode);
    try {
      const doc = await buildPdf(labels, tpl, opt, tpl.kind === "thermal" ? { ...size, gapX: num(gap, 3, 0, 20), marginLeft: num(shift, 0, 0, 30) } : undefined);
      const fname = `label-${tpl.kind === "thermal" ? `${size.w}x${size.h}mm` : tpl.id}-${labels.length}.pdf`;
      if (mode === "save") doc.save(fname);
      else {
        doc.autoPrint();
        const url = doc.output("bloburl") as unknown as string;
        const win = window.open(url, "_blank");
        if (!win) doc.save(fname);
      }
    } catch (e) {
      toast(`Gagal membuat PDF: ${errorMessage(e)}`, "err");
    } finally { setBusy(""); }
  }

  async function fill(mode: "code" | "ean13") {
    if (!tenant) return;
    setFilling(true);
    const { data, error } = await supabase().rpc("fill_missing_barcodes", { p_tenant: tenant.id, p_mode: mode });
    setFilling(false);
    if (error) { toast(errorMessage(error), "err"); return; }
    toast(`${Number(data) || 0} barang diberi barcode`, "ok");
    setFillOpen(false);
    reload();
  }

  if (!cat) return <><PageHeader title="Cetak label barcode" back="/barang" /><Spinner /></>;

  return (
    <>
      <PageHeader title="Cetak label barcode" subtitle={`${labels.length} label · ${selected.length} barang`} back="/barang" />
      <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-4 pb-32 lg:grid-cols-[1fr_380px] lg:px-6 lg:pb-8">
        <div className="flex flex-col gap-4">
          {noBarcode ? (
            <Card className="flex items-start gap-3 border-warn/30 bg-warn-soft">
              <IconAlert className="mt-0.5 flex-none text-warn" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm"><b>{noBarcode} barang belum punya barcode.</b> Bisa pakai kode barang sebagai barcode, atau dibuatkan EAN-13 otomatis.</p>
                <button onClick={() => setFillOpen(true)} className="self-start rounded-xl2 bg-white px-3 py-2 text-sm font-bold text-warn ring-1 ring-warn/30">Lengkapi barcode</button>
              </div>
            </Card>
          ) : null}

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">1. Pilih barang & jumlah label</h2>
            <label className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong px-3">
              <IconSearch size={18} className="text-ink-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, barcode" aria-label="Cari barang" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Chip onClick={() => setAll(() => 1)}>1 label tiap barang</Chip>
              <Chip onClick={() => setAll((it) => Math.max(0, Math.ceil(qtyIn(cat, it.id, whIds))))}>Sesuai stok</Chip>
              <Chip onClick={() => setAll(() => 0)}>Kosongkan</Chip>
            </div>
            <div className="-mx-4 max-h-[52vh] overflow-y-auto border-t border-[#EEF0F3] lg:max-h-[60vh]">
              {list.slice(0, 300).map((it) => {
                const v = valueOf(it);
                const n = copies[it.id] ?? 0;
                return (
                  <div key={it.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4 py-2.5">
                    <button onClick={() => setCopies((c) => ({ ...c, [it.id]: n ? 0 : 1 }))} aria-label={n ? "Batal pilih" : "Pilih"}
                      className={cx("flex h-6 w-6 flex-none items-center justify-center rounded-md border-2", n ? "border-brand bg-brand text-white" : "border-line-strong")}>
                      {n ? <IconCheck size={14} /> : null}
                    </button>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{it.name}</span>
                      <span className={cx("truncate text-xs", v ? "text-ink-muted" : "text-danger")}>{v || "Tanpa barcode & kode"} · stok {qtyIn(cat, it.id, whIds)}</span>
                    </span>
                    {n ? <Stepper value={n} min={0} max={999} onChange={(x) => setCopies((c) => ({ ...c, [it.id]: Math.round(x) }))} /> : null}
                  </div>
                );
              })}
              {list.length > 300 ? <p className="px-4 py-3 text-xs text-ink-muted">Menampilkan 300 dari {list.length}. Persempit pencarian.</p> : null}
              {list.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink-muted">Tidak ada barang.</p> : null}
            </div>
            {unusable.length ? <p className="text-xs text-danger">{unusable.length} barang terpilih dilewati karena tidak punya barcode/kode yang bisa dicetak.</p> : null}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">2. Ukuran label & printer</h2>
            <Field label="Template" htmlFor="tpl">
              <Select id="tpl" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                <optgroup label="Printer thermal (roll label)">{TEMPLATES.filter((t) => t.kind === "thermal").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
                <optgroup label="Printer biasa (kertas label A4)">{TEMPLATES.filter((t) => t.kind === "sheet").map((t) => <option key={t.id} value={t.id}>{t.name} · {t.desc}</option>)}</optgroup>
              </Select>
            </Field>
            {tpl.kind === "thermal" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Lebar (mm)" htmlFor="cw"><Input id="cw" inputMode="decimal" value={cw} onChange={(e) => setCw(e.target.value)} /></Field>
                <Field label="Tinggi (mm)" htmlFor="ch"><Input id="ch" inputMode="decimal" value={ch} onChange={(e) => setCh(e.target.value)} /></Field>
                {multi ? <>
                  <Field label="Jarak antar kolom (mm)" htmlFor="gx"><Input id="gx" inputMode="decimal" value={gap} onChange={(e) => setGap(e.target.value)} /></Field>
                  <Field label="Geser kiri (mm)" htmlFor="ml"><Input id="ml" inputMode="decimal" value={shift} onChange={(e) => setShift(e.target.value)} /></Field>
                  <p className="col-span-2 text-xs text-ink-muted">Satu baris berisi {tpl.cols} label. Ukuran kertas di printer: {(num(shift, 0, 0, 30) * 2 + (tpl.cols ?? 1) * size.w + ((tpl.cols ?? 1) - 1) * num(gap, 3, 0, 20)).toFixed(1).replace(".0", "")} × {size.h} mm. Kalau cetakan meleset ke samping, ubah jarak kolom / geser kiri.</p>
                </> : null}
              </div>
            ) : <p className="text-xs text-ink-muted">{tpl.desc}. {pages ? `${pages} lembar A4.` : ""}</p>}
            <Field label="Isi barcode" htmlFor="src">
              <Select id="src" value={source} onChange={(e) => setSource(e.target.value as Source)}>
                <option value="barcode">Barcode barang (pakai kode bila kosong)</option>
                <option value="code">Kode barang (mis. GLS-300)</option>
              </Select>
            </Field>
            <div className="flex flex-col gap-1">
              <Toggle on={opt.showName} onClick={() => setOpt({ ...opt, showName: !opt.showName })}>Nama barang</Toggle>
              <Toggle on={opt.showCode} onClick={() => setOpt({ ...opt, showCode: !opt.showCode })}>{source === "barcode" ? "Kode barang" : "Nomor barcode"} di bawah</Toggle>
              {isOwner ? <Toggle on={opt.showPrice} onClick={() => setOpt({ ...opt, showPrice: !opt.showPrice })}>Harga jual</Toggle> : null}
              <Toggle on={opt.border} onClick={() => setOpt({ ...opt, border: !opt.border })}>Garis potong (untuk kertas biasa)</Toggle>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">Pratinjau</h2>
            <div className="flex justify-center rounded-xl2 bg-canvas p-4">
              <svg viewBox={`0 0 ${size.w} ${size.h}`} className="w-full max-w-[280px] rounded bg-white shadow-sm ring-1 ring-line" style={{ aspectRatio: `${size.w} / ${size.h}` }} role="img" aria-label="Pratinjau label">
                {lay.shapes.map((s, i) => s.t === "rect" ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="#000" />
                  : s.t === "frame" ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="#aaa" strokeWidth={0.15} />
                  : <text key={i} x={s.x} y={s.y} fontSize={s.s * 0.3528} fontWeight={s.bold ? 700 : 400} fontFamily="Helvetica, Arial, sans-serif" textAnchor={s.align === "left" ? "start" : s.align === "right" ? "end" : "middle"} dominantBaseline="text-after-edge">{s.text}</text>)}
              </svg>
            </div>
            {tooDense ? <p className="text-xs leading-relaxed text-danger">{dense.length ? `${dense.length} kode terlalu panjang untuk label ini (mis. ${dense.slice(0, 3).join(", ")}) dan bisa sulit di-scan.` : "Barcode terlalu rapat untuk ukuran ini."} Untuk label 33 × 15 mm pakai kode maks. ±10 karakter, atau barcode EAN-13 (tombol “Lengkapi barcode” / “Buat” di detail barang).</p> : null}
            <details className="text-xs leading-relaxed text-ink-muted">
              <summary className="cursor-pointer font-semibold text-ink-2">Tips supaya hasil cetak pas</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li><b>Printer thermal</b>: di pengaturan printer, samakan ukuran kertas dengan ukuran label, margin 0, skala 100% / “Ukuran sebenarnya”. Di HP Android, buka PDF lalu cetak lewat aplikasi printer (mis. aplikasi bawaan printer atau print service Bluetooth).</li>
                <li><b>Printer biasa</b>: pakai kertas label A4 sesuai jumlah kolom × baris, cetak dengan skala 100% (jangan “Fit to page”). Coba 1 lembar kertas biasa dulu untuk cek posisi.</li>
                <li>Barcode berupa vektor, jadi tetap tajam di printer 203 dpi maupun 300 dpi.</li>
              </ul>
            </details>
          </Card>
        </div>
      </div>

      <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white px-4 pt-3 lg:left-64">
        <Button variant="secondary" className="mb-3" onClick={() => makePdf("save")} loading={busy === "save"} disabled={!labels.length || !!busy}><IconDownload size={18} />PDF</Button>
        <Button className="mb-3 flex-1" onClick={() => makePdf("print")} loading={busy === "print"} disabled={!labels.length || !!busy}>Cetak {labels.length || ""} label</Button>
      </footer>

      <Sheet open={fillOpen} onClose={() => setFillOpen(false)} title="Lengkapi barcode">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">Untuk {noBarcode} barang yang barcode-nya masih kosong. Barcode yang sudah ada tidak diubah.</p>
          <Button onClick={() => fill("code")} loading={filling}>Pakai kode barang sebagai barcode</Button>
          <Button variant="secondary" onClick={() => fill("ean13")} loading={filling}>Buat EAN-13 internal otomatis</Button>
          <p className="text-xs text-ink-muted">Barang tanpa kode dilewati pada pilihan pertama. EAN-13 internal (awalan 2) aman dipakai di dalam gudang/toko sendiri.</p>
        </div>
      </Sheet>
    </>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="h-9 rounded-full border border-line-strong bg-white px-3 text-[13px] font-semibold text-ink-2 active:bg-canvas">{children}</button>;
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} role="switch" aria-checked={on} className="flex h-11 items-center justify-between gap-3 text-left text-sm font-semibold">
      {children}
      <span className={cx("relative h-6 w-10 flex-none rounded-full transition-colors", on ? "bg-brand" : "bg-line-strong")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

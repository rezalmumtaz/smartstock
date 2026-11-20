"use client";

import { useEffect, useMemo, useState } from "react";
import { WarehousePicker } from "@/components/AppShell";
import { IconBox, IconCheck, IconDownload, IconSearch } from "@/components/icons";
import { Button, Card, cx, Field, Input, PageHeader, Spinner, Textarea, useToast } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { catalogText, stockText, type CatalogEntry, type CatalogOptions, type PhotoMode, type StockMode } from "@/lib/catalog";
import { brosurImages, buildDesignedCatalog, customTheme, THEMES, type BrosurGrid, type DesignOptions, type Layout, type ThemeId } from "@/lib/catalog-pdf";
import { loadCatalog, qtyIn, type Catalog } from "@/lib/data";
import { fmtRp, todayISO } from "@/lib/format";
import { errorMessage } from "@/lib/supabase";

const NONE = "__none";

export default function KatalogPage() {
  const { tenant, isOwner } = useApp();
  const whIds = useActiveWarehouseIds();
  const toast = useToast();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [groups, setGroups] = useState<Set<string>>(new Set()); // kosong = semua grup
  const [q, setQ] = useState("");
  const [off, setOff] = useState<Set<string>>(new Set()); // barang yang tidak dicentang
  const [hideEmpty, setHideEmpty] = useState(true);
  const [opt, setOpt] = useState<CatalogOptions>({ title: "", company: "", contact: "", note: "", stock: "status", photos: "main", showPrice: false, showCode: false });
  const [design, setDesign] = useState<DesignOptions>(() => {
    const d: DesignOptions = { layout: "brosur", theme: "langit", inkSaver: false, cover: true, perPage: "3x4", priceLabel: "Harga", shareAs: "jpg", customColor: "#0E7C66" };
    try { return { ...d, ...JSON.parse(localStorage.getItem("ss.catalogDesign") ?? "{}") }; } catch { return d; }
  });
  useEffect(() => { try { localStorage.setItem("ss.catalogDesign", JSON.stringify(design)); } catch { /* abaikan */ } }, [design]);
  const [busy, setBusy] = useState<"" | "share" | "pdf" | "jpg">("");
  const brosur = design.layout === "brosur";
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!tenant) return;
    loadCatalog(tenant.id, isOwner).then(setCat).catch((e) => toast(errorMessage(e), "err"));
    setOpt((o) => ({ ...o, company: tenant.name, title: o.title || `Katalog ${tenant.name}`, contact: o.contact || tenant.phone || "", showPrice: isOwner }));
  }, [tenant, isOwner, toast]);

  const groupName = useMemo(() => Object.fromEntries((cat?.groups ?? []).map((g) => [g.id, g.name])), [cat]);
  const pool = useMemo(() => {
    if (!cat) return [];
    const term = q.trim().toLowerCase();
    return cat.items.filter((it) => {
      if (groups.size && !groups.has(it.group_id ?? NONE)) return false;
      if (hideEmpty && qtyIn(cat, it.id, whIds) <= 0) return false;
      return !term || it.name.toLowerCase().includes(term) || it.code?.toLowerCase().includes(term);
    });
  }, [cat, groups, q, hideEmpty, whIds]);
  const chosen = pool.filter((it) => !off.has(it.id));

  const entries: CatalogEntry[] = useMemo(() => !cat ? [] : chosen.map((it) => ({
    name: it.name, code: it.code, unit: it.unit, group: it.group_id ? groupName[it.group_id] ?? "" : "",
    price: isOwner && cat.prices[it.id] ? Number(cat.prices[it.id].sell_price) : null,
    qty: qtyIn(cat, it.id, whIds), min: it.min_qty, photos: it.image_urls ?? [], description: it.description,
  })), [cat, chosen, groupName, isOwner, whIds]);
  const o = { ...opt, showPrice: isOwner && opt.showPrice };
  const baseName = `${(o.title || "katalog").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase()}-${todayISO()}`;
  const fileName = `${baseName}.pdf`;

  function toggleGroup(id: string) { setGroups((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  async function makePdf() {
    setProgress("Menyiapkan foto…");
    const doc = await buildDesignedCatalog(entries, o, design, (d, t) => setProgress(`Menyusun ${d}/${t} barang…`));
    setProgress("");
    return doc;
  }

  async function makeImages() {
    setProgress("Menyiapkan foto…");
    const files = await brosurImages(entries, o, design, baseName, (d, t) => setProgress(`Menyusun ${d}/${t} barang…`));
    setProgress("");
    return files;
  }

  /** Unduh beberapa file satu per satu (fallback bila HP tidak bisa membagikan langsung). */
  function saveFiles(files: File[]) {
    files.forEach((f, i) => setTimeout(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f); a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, i * 400));
  }

  async function share() {
    if (!entries.length) return;
    setBusy("share");
    try {
      const files = brosur && design.shareAs !== "pdf" ? await makeImages() : [new File([(await makePdf()).output("blob")], fileName, { type: "application/pdf" })];
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: o.title, text: o.note || o.title }).catch((e) => { if (e?.name !== "AbortError") throw e; });
      } else {
        saveFiles(files);
        toast("HP ini tidak mendukung bagikan langsung. File diunduh, kirim lewat WhatsApp dari galeri/file.");
      }
    } catch (e) { toast(`Gagal membuat katalog: ${errorMessage(e)}`, "err"); } finally { setBusy(""); setProgress(""); }
  }

  async function download() {
    if (!entries.length) return;
    setBusy("pdf");
    try { (await makePdf()).save(fileName); } catch (e) { toast(`Gagal membuat PDF: ${errorMessage(e)}`, "err"); } finally { setBusy(""); setProgress(""); }
  }

  async function downloadJpg() {
    if (!entries.length) return;
    setBusy("jpg");
    try { saveFiles(await makeImages()); } catch (e) { toast(`Gagal membuat gambar: ${errorMessage(e)}`, "err"); } finally { setBusy(""); setProgress(""); }
  }

  async function copyText() {
    if (!entries.length) return;
    const text = catalogText(entries, o);
    try { await navigator.clipboard.writeText(text); toast("Teks katalog disalin. Tempel di chat WhatsApp."); }
    catch { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank"); }
  }

  if (!cat) return <><PageHeader title="Katalog digital" back="/barang" /><Spinner /></>;

  const groupIds = [...cat.groups.map((g) => g.id), ...(cat.items.some((i) => !i.group_id) ? [NONE] : [])];

  return (
    <>
      <PageHeader title="Katalog digital" subtitle={`${entries.length} barang dipilih`} back="/barang" />
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 py-4 pb-36 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-6">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">1. Pilih barang</h2>
            <WarehousePicker />
            <div className="flex flex-wrap gap-2">
              <Chip on={groups.size === 0} onClick={() => setGroups(new Set())}>Semua barang</Chip>
              {groupIds.map((g) => <Chip key={g} on={groups.has(g)} onClick={() => toggleGroup(g)}>{g === NONE ? "Tanpa grup" : groupName[g]}</Chip>)}
            </div>
            <label className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong px-3">
              <IconSearch size={18} className="text-ink-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau kode" aria-label="Cari barang" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold">
              <label className="flex items-center gap-2 text-ink-2"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 accent-[#0E7C66]" />Sembunyikan yang stoknya habis</label>
              <span className="flex gap-3">
                <button onClick={() => setOff(new Set())} className="text-brand">Pilih semua</button>
                <button onClick={() => setOff(new Set(pool.map((i) => i.id)))} className="text-ink-muted">Kosongkan</button>
              </span>
            </div>
            <div className="-mx-4 max-h-[52vh] overflow-y-auto border-t border-[#EEF0F3]">
              {pool.slice(0, 400).map((it) => {
                const on = !off.has(it.id);
                const e: CatalogEntry = { name: it.name, code: it.code, unit: it.unit, group: "", price: null, qty: qtyIn(cat, it.id, whIds), min: it.min_qty, photos: [] };
                return (
                  <button key={it.id} onClick={() => setOff((s) => { const n = new Set(s); if (on) n.add(it.id); else n.delete(it.id); return n; })} className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-2.5 text-left active:bg-canvas">
                    <span className={cx("flex h-6 w-6 flex-none items-center justify-center rounded-md border-2", on ? "border-brand bg-brand text-white" : "border-line-strong")}>{on ? <IconCheck size={14} /> : null}</span>
                    <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#F2F4F7] text-[#98A2B3]">
                      {it.image_urls?.[0] ? <img src={it.image_urls[0]} alt="" className="h-full w-full bg-white object-contain" /> : <IconBox size={18} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{it.name}</span>
                      <span className="truncate text-xs text-ink-muted">{[it.group_id ? groupName[it.group_id] : null, stockText(e, "qty"), isOwner && cat.prices[it.id] ? fmtRp(cat.prices[it.id].sell_price) : null, (it.image_urls?.length ?? 0) ? `${it.image_urls.length} foto` : "tanpa foto"].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                );
              })}
              {pool.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink-muted">Tidak ada barang.</p> : null}
              {pool.length > 400 ? <p className="px-4 py-3 text-xs text-ink-muted">Menampilkan 400 dari {pool.length}. Semua tetap ikut ke katalog.</p> : null}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">2. Isi katalog</h2>
            <Field label="Judul" htmlFor="kt"><Input id="kt" value={opt.title} onChange={(e) => setOpt({ ...opt, title: e.target.value })} /></Field>
            <Field label="Kontak pemesanan" htmlFor="kc"><Input id="kc" value={opt.contact} onChange={(e) => setOpt({ ...opt, contact: e.target.value })} placeholder="Contoh: WA 0812-3456-7890" /></Field>
            <Field label="Catatan untuk pelanggan" htmlFor="kn"><Textarea id="kn" value={opt.note} onChange={(e) => setOpt({ ...opt, note: e.target.value })} placeholder="Contoh: Harga belum termasuk ongkir. Berlaku selama stok tersedia." /></Field>
            <Seg label="Harga jual" value={o.showPrice ? "y" : "n"} onChange={(v) => setOpt({ ...opt, showPrice: v === "y" })} options={[["y", "Tampilkan"], ["n", "Sembunyikan"]]} disabled={!isOwner} hint={!isOwner ? "Harga hanya bisa ditampilkan oleh owner." : undefined} />
            <Seg label="Stok" value={opt.stock} onChange={(v) => setOpt({ ...opt, stock: v as StockMode })} options={[["status", "Tersedia/Habis"], ["qty", "Jumlah"], ["none", "Sembunyikan"]]} />
            <Seg label="Foto" value={opt.photos} onChange={(v) => setOpt({ ...opt, photos: v as PhotoMode })} options={[["main", "Foto utama"], ["all", "Semua foto"], ["none", "Tanpa foto"]]} />
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={opt.showCode} onChange={(e) => setOpt({ ...opt, showCode: e.target.checked })} className="h-4 w-4 accent-[#0E7C66]" />Tampilkan kode barang</label>
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">3. Desain PDF</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {LAYOUTS.map((l) => (
                <button key={l.id} type="button" onClick={() => setDesign({ ...design, layout: l.id })}
                  className={cx("flex flex-col items-center gap-1.5 rounded-xl2 border-2 p-2 text-center", design.layout === l.id ? "border-brand bg-brand-soft" : "border-line")}>
                  <LayoutIcon id={l.id} />
                  <span className="text-[12px] font-bold leading-tight">{l.label}</span>
                  <span className="text-[10.5px] leading-tight text-ink-muted">{l.desc}</span>
                </button>
              ))}
            </div>
            {brosur ? (
              <>
                <Seg label="Isi per halaman" value={design.perPage ?? "3x4"} onChange={(v) => setDesign({ ...design, perPage: v as BrosurGrid })}
                  options={[["2x3", "6 barang"], ["3x4", "12 barang"], ["4x5", "20 barang"]]} />
                <Field label="Tulisan di depan harga" htmlFor="pl" hint="Contoh: CASH, Harga, Grosir. Kosongkan untuk harga saja.">
                  <Input id="pl" value={design.priceLabel ?? ""} onChange={(e) => setDesign({ ...design, priceLabel: e.target.value.slice(0, 16) })} placeholder="Harga" />
                </Field>
                <Seg label="Tombol Bagikan mengirim" value={design.shareAs ?? "jpg"} onChange={(v) => setDesign({ ...design, shareAs: v as "jpg" | "pdf" })}
                  options={[["jpg", "Gambar (JPG)"], ["pdf", "PDF"]]} />
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-3">Warna</span>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
                {(Object.keys(THEMES) as Exclude<ThemeId, "custom">[]).map((id) => (
                  <button key={id} type="button" onClick={() => setDesign({ ...design, theme: id })} aria-label={`Warna ${THEMES[id].label}`} aria-pressed={design.theme === id}
                    className={cx("flex flex-col items-center gap-1 rounded-xl2 border-2 p-1", design.theme === id ? "border-brand" : "border-transparent")}>
                    <span className="h-7 w-full rounded-lg" style={{ background: THEMES[id].swatch }} />
                    <span className="text-[10.5px] font-semibold text-ink-2">{THEMES[id].label}</span>
                  </button>
                ))}
              </div>
              <label className={cx("flex items-center gap-3 rounded-xl2 border-2 p-2", design.theme === "custom" ? "border-brand bg-brand-soft" : "border-line")}>
                <input type="color" value={design.customColor ?? "#0E7C66"} aria-label="Pilih warna sendiri"
                  onChange={(e) => setDesign({ ...design, theme: "custom", customColor: e.target.value })}
                  onClick={() => setDesign({ ...design, theme: "custom" })}
                  className="h-9 w-12 flex-none cursor-pointer rounded-lg border border-line bg-white p-0.5" />
                <span className="h-7 w-10 flex-none rounded-lg" style={{ background: customTheme(design.customColor ?? "#0E7C66").swatch }} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-bold">Warna sendiri</span>
                  <span className="text-[11px] text-ink-muted">Samakan dengan warna logo toko</span>
                </span>
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={design.inkSaver} onChange={(e) => setDesign({ ...design, inkSaver: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#0E7C66]" /><span>Hemat tinta untuk dicetak<span className="block text-xs font-normal text-ink-muted">Latar putih, warna hanya di aksen.</span></span></label>
            {!brosur ? <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={design.cover} onChange={(e) => setDesign({ ...design, cover: e.target.checked })} className="h-4 w-4 accent-[#0E7C66]" />Halaman sampul</label> : null}
          </Card>
          <p className="px-1 text-xs leading-relaxed text-ink-muted">{brosur ? <>Brosur: tiap barang diberi kode urut per grup (A01, A02, B01…). Tulis di deskripsi barang <b>Ukuran: 750 ml</b> supaya tampil merah di bawah nama, dan <b>Isi: 40 pcs</b> untuk isi per dus di pojok kanan bawah. </> : null}PDF berukuran A4 (1 barang per halaman: A4 mendatar). Saat mencetak pilih kertas A4 dan skala 100% / &ldquo;Ukuran sebenarnya&rdquo;. Tulis spesifikasi di deskripsi barang dengan format <b>Label: isi</b> per baris (contoh &ldquo;Bahan: Stainless steel&rdquo;) supaya tampil sebagai tabel. Foto berlatar putih otomatis dibuat melayang di atas lingkaran.</p>
        </div>
      </div>

      <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 flex flex-col gap-1 border-t border-line bg-white px-4 pt-3 lg:left-64">
        {progress ? <span className="text-xs font-semibold text-ink-3">{progress}</span> : null}
        <div className="mb-3 flex gap-2">
          <Button variant="secondary" onClick={copyText} disabled={!entries.length || !!busy} className="px-3">Salin teks</Button>
          <Button variant="secondary" onClick={download} loading={busy === "pdf"} disabled={!entries.length || !!busy} className="px-3"><IconDownload size={18} />PDF</Button>
          {brosur ? <Button variant="secondary" onClick={downloadJpg} loading={busy === "jpg"} disabled={!entries.length || !!busy} className="px-3"><IconDownload size={18} />JPG</Button> : null}
          <Button onClick={share} loading={busy === "share"} disabled={!entries.length || !!busy} className="flex-1">Bagikan</Button>
        </div>
      </footer>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cx("h-9 rounded-full border px-3 text-[13px] font-semibold", on ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-ink-2")}>{children}</button>;
}

function Seg({ label, value, onChange, options, disabled, hint }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <div className="flex gap-1 rounded-xl2 bg-[#F2F4F7] p-1">
        {options.map(([v, l]) => (
          <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)} className={cx("h-9 flex-1 rounded-[10px] text-[13px] font-bold disabled:opacity-50", value === v ? "bg-white text-ink shadow-sm" : "text-ink-muted")}>{l}</button>
        ))}
      </div>
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}

const LAYOUTS: { id: Layout; label: string; desc: string }[] = [
  { id: "brosur", label: "Brosur", desc: "Banyak barang / halaman" },
  { id: "showcase", label: "Per halaman", desc: "1 barang, A4 mendatar" },
  { id: "grid", label: "Grid", desc: "Kartu 2 kolom, A4 tegak" },
  { id: "list", label: "Daftar harga", desc: "Tabel ringkas, A4" },
];

function LayoutIcon({ id }: { id: Layout }) {
  const c = "fill-current text-brand";
  if (id === "brosur") return <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><rect x="5" y="1" width="28" height="36" rx="3" className="fill-white stroke-line-strong" /><rect x="5" y="1" width="28" height="6" rx="3" className={c} />{[0, 1, 2, 3].map((r) => [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={7.5 + k * 8} y={9.5 + r * 6.8} width="7" height="6" rx="1" className={c} opacity={0.45 + ((r + k) % 2) * 0.3} />))}</svg>;
  if (id === "showcase") return <svg width="54" height="38" viewBox="0 0 54 38" aria-hidden="true"><rect x="1" y="1" width="52" height="36" rx="3" className="fill-white stroke-line-strong" /><circle cx="17" cy="20" r="10" className={c} opacity=".35" /><rect x="30" y="9" width="19" height="21" rx="3" className={c} /></svg>;
  if (id === "grid") return <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><rect x="5" y="1" width="28" height="36" rx="3" className="fill-white stroke-line-strong" />{[0, 1, 2].map((r) => [0, 1].map((k) => <rect key={`${r}${k}`} x={8 + k * 12} y={6 + r * 10.5} width="10" height="9" rx="1.5" className={c} opacity={0.5 + k * 0.3} />))}</svg>;
  return <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><rect x="5" y="1" width="28" height="36" rx="3" className="fill-white stroke-line-strong" /><rect x="5" y="1" width="28" height="7" rx="3" className={c} />{[0, 1, 2, 3, 4].map((r) => <rect key={r} x="9" y={12 + r * 5} width="20" height="2.4" rx="1" className={c} opacity=".45" />)}</svg>;
}

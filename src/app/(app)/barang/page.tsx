"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { WarehousePicker } from "@/components/AppShell";
import { IconBox, IconDoc, IconDownload, IconPin, IconPlus, IconPrinter, IconScan, IconSearch, IconUpload } from "@/components/icons";
import { cx, Empty, Spinner, useToast } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { lastChangedAt, loadCatalog, locationLabel, qtyIn, stockStatus, type Catalog } from "@/lib/data";
import { downloadXlsx } from "@/lib/excel";
import { fmtQty, fmtRp } from "@/lib/format";

type StockFilter = "all" | "tersedia" | "menipis" | "habis";
const STOCK_FILTERS: StockFilter[] = ["all", "tersedia", "menipis", "habis"];

const SORTS = [
  { id: "nama-az", label: "Nama A–Z" },
  { id: "nama-za", label: "Nama Z–A" },
  { id: "stok-banyak", label: "Stok terbanyak" },
  { id: "stok-sedikit", label: "Stok tersedikit" },
  { id: "terakhir-diubah", label: "Terakhir diubah" },
  { id: "terbaru", label: "Terbaru ditambah" },
  { id: "harga-tinggi", label: "Harga tertinggi", ownerOnly: true },
  { id: "harga-rendah", label: "Harga terendah", ownerOnly: true },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const SORT_KEY = "ss.barangSort";

function readSort(): SortId {
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (SORTS.some((s) => s.id === v)) return v as SortId;
  } catch { /* abaikan */ }
  return "nama-az";
}

const byName = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });

export default function BarangPage() {
  return <Suspense fallback={<Spinner />}><BarangList /></Suspense>;
}

function BarangList() {
  const { tenant, isOwner, canEditMaster, warehouses, warehouseFilter, warehouseNames } = useApp();
  const whIds = useActiveWarehouseIds();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  // ?filter= dari tautan lama bisa berisi status stok ("menipis") atau id grup.
  const initialFilter = params.get("filter") ?? "all";
  const [stockFilter, setStockFilter] = useState<StockFilter>(STOCK_FILTERS.includes(initialFilter as StockFilter) ? (initialFilter as StockFilter) : "all");
  const [group, setGroup] = useState<string>(params.get("grup") ?? (STOCK_FILTERS.includes(initialFilter as StockFilter) ? "all" : initialFilter));
  const [sort, setSortState] = useState<SortId>("nama-az");

  // Urutan terakhir diingat per perangkat.
  useEffect(() => setSortState(readSort()), []);
  function setSort(v: SortId) {
    setSortState(v);
    try { localStorage.setItem(SORT_KEY, v); } catch { /* abaikan */ }
  }
  const sortOptions = SORTS.filter((o) => !("ownerOnly" in o) || isOwner);
  const effectiveSort: SortId = sortOptions.some((o) => o.id === sort) ? sort : "nama-az";

  useEffect(() => {
    if (!tenant) return;
    loadCatalog(tenant.id, isOwner).then(setCat).catch((e) => toast(String(e.message ?? e), "err"));
  }, [tenant, isOwner, toast]);

  // Barang setelah filter kategori + kata kunci (dasar hitungan tiap tombol stok).
  const base = useMemo(() => {
    if (!cat) return [];
    const term = q.trim().toLowerCase();
    return cat.items
      .map((it) => {
        const qty = qtyIn(cat, it.id, whIds);
        return { it, qty, status: stockStatus(it, qty), loc: locationLabel(cat, it.id, whIds, warehouseNames) };
      })
      .filter(({ it, loc }) => {
        if (group === "none" ? it.group_id : group !== "all" && it.group_id !== group) return false;
        if (!term) return true;
        return [it.name, it.code, it.barcode, loc].some((v) => v?.toLowerCase().includes(term));
      });
  }, [cat, q, group, whIds, warehouseNames]);

  const counts = useMemo(() => ({
    all: base.length,
    tersedia: base.filter((r) => r.qty > 0).length,
    menipis: base.filter((r) => r.status === "menipis").length,
    habis: base.filter((r) => r.status === "habis").length,
  }), [base]);

  const rows = useMemo(() => {
    if (!cat) return [];
    const list = base.filter((r) =>
      stockFilter === "all" ? true : stockFilter === "tersedia" ? r.qty > 0 : r.status === stockFilter);
    const price = (id: string) => cat.prices[id]?.sell_price;
    const cmp = (a: (typeof list)[number], b: (typeof list)[number]): number => {
      switch (effectiveSort) {
        case "nama-za": return byName(b.it.name, a.it.name);
        case "stok-banyak": return b.qty - a.qty;
        case "stok-sedikit": return a.qty - b.qty;
        case "terakhir-diubah": return lastChangedAt(cat, b.it, whIds) - lastChangedAt(cat, a.it, whIds);
        case "terbaru": return (Date.parse(b.it.created_at ?? "") || 0) - (Date.parse(a.it.created_at ?? "") || 0);
        case "harga-tinggi":
        case "harga-rendah": {
          const pa = price(a.it.id), pb = price(b.it.id);
          if (pa === undefined || pb === undefined) return pa === pb ? 0 : pa === undefined ? 1 : -1; // tanpa harga di bawah
          return effectiveSort === "harga-tinggi" ? pb - pa : pa - pb;
        }
        default: return 0;
      }
    };
    return [...list].sort((a, b) =>
      // Barang nonaktif selalu di bawah, lalu urutan pilihan, lalu nama A–Z sebagai penentu.
      Number(a.it.is_active === false) - Number(b.it.is_active === false) || cmp(a, b) || byName(a.it.name, b.it.name));
  }, [cat, base, stockFilter, effectiveSort, whIds]);

  const totalUnits = rows.reduce((s, r) => s + r.qty, 0);
  const whLabel = warehouseFilter === "all" ? "Semua gudang" : warehouseNames[warehouseFilter];

  async function exportExcel() {
    if (!cat) return;
    const groupName = Object.fromEntries(cat.groups.map((g) => [g.id, g.name]));
    const cols = [
      { header: "Nama barang", key: "name", width: 32 }, { header: "Kode", key: "code" }, { header: "Barcode", key: "barcode", width: 18 },
      { header: "Satuan", key: "unit" }, { header: "Grup", key: "group" }, { header: "Stok minimum", key: "min_qty" },
      ...(isOwner ? [{ header: "Harga beli", key: "purchase_price" }, { header: "Harga jual", key: "sell_price" }] : []),
      ...warehouses.map((w) => ({ header: `Stok ${w.name}`, key: `wh_${w.id}` })),
      ...warehouses.map((w) => ({ header: `Lokasi ${w.name}`, key: `loc_${w.id}`, width: 24 })),
    ];
    const data = cat.items.map((it) => ({
      name: it.name, code: it.code ?? "", barcode: it.barcode ?? "", unit: it.unit ?? "", group: it.group_id ? groupName[it.group_id] : "",
      min_qty: it.min_qty ?? "", purchase_price: cat.prices[it.id]?.purchase_price ?? "", sell_price: cat.prices[it.id]?.sell_price ?? "",
      ...Object.fromEntries(warehouses.map((w) => [`wh_${w.id}`, cat.stock[it.id]?.[w.id] ?? 0])),
      ...Object.fromEntries(warehouses.map((w) => [`loc_${w.id}`, cat.locations[it.id]?.[w.id] ?? ""])),
    }));
    await downloadXlsx(`barang-${tenant?.name ?? "smart-stock"}.xlsx`, [{ name: "Barang", columns: cols, rows: data }]);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line bg-white px-4 pb-3 pt-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold">Barang</h1>
            <span className="text-xs text-ink-muted">{whLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {canEditMaster ? <>
            <Link href="/impor" aria-label="Impor dari Excel" className="flex h-11 w-11 items-center justify-center rounded-xl2 border border-line text-ink-2 lg:w-auto lg:gap-2 lg:px-3 lg:text-sm lg:font-semibold"><IconUpload size={19} /><span className="hidden lg:inline">Impor</span></Link>
            <Link href="/barang/katalog" aria-label="Katalog digital" className="flex h-11 w-11 items-center justify-center rounded-xl2 border border-line text-ink-2 lg:w-auto lg:gap-2 lg:px-3 lg:text-sm lg:font-semibold"><IconDoc size={19} /><span className="hidden lg:inline">Katalog</span></Link>
            <Link href="/barang/label" aria-label="Cetak label barcode" className="flex h-11 w-11 items-center justify-center rounded-xl2 border border-line text-ink-2 lg:w-auto lg:gap-2 lg:px-3 lg:text-sm lg:font-semibold"><IconPrinter size={19} /><span className="hidden lg:inline">Label</span></Link>
            <button onClick={exportExcel} aria-label="Ekspor ke Excel" className="flex h-11 w-11 items-center justify-center rounded-xl2 border border-line text-ink-2 lg:w-auto lg:gap-2 lg:px-3 lg:text-sm lg:font-semibold"><IconDownload size={19} /><span className="hidden lg:inline">Ekspor</span></button>
            <Link href="/barang/baru" className="hidden h-11 items-center gap-2 rounded-xl2 bg-brand px-4 text-sm font-bold text-white lg:flex"><IconPlus size={18} />Barang baru</Link>
            </> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="flex flex-1 gap-2 lg:min-w-[15rem]">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl2 border border-line bg-canvas px-3">
              <IconSearch size={18} className="text-ink-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, barcode, lokasi" aria-label="Cari barang"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <button onClick={() => router.push("/scan?cari=1")} aria-label="Scan barcode untuk mencari" className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-brand text-white"><IconScan size={19} /></button>
          </div>
          <div className="lg:w-52 lg:flex-none"><WarehousePicker /></div>
          {/* Kategori + urutan sejajar (di HP dua kolom, hemat tempat). */}
          <div className="grid grid-cols-2 gap-2 lg:w-[24rem] lg:flex-none">
            <MiniSelect label="Kategori" value={group} onChange={(v) => v === "__kelola" ? router.push("/pengaturan/grup") : setGroup(v)}>
              <option value="all">Semua kategori</option>
              {cat?.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="none">Tanpa kategori</option>
              {canEditMaster ? <option value="__kelola">＋ Kelola grup…</option> : null}
            </MiniSelect>
            <MiniSelect label="Urutkan" value={effectiveSort} onChange={(v) => setSort(v as SortId)}>
              {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </MiniSelect>
          </div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0">
          <Chip active={stockFilter === "all"} onClick={() => setStockFilter("all")}>Semua · {counts.all}</Chip>
          <Chip active={stockFilter === "tersedia"} tone="ok" onClick={() => setStockFilter("tersedia")}>Stok tersedia · {counts.tersedia}</Chip>
          <Chip active={stockFilter === "menipis"} tone="warn" onClick={() => setStockFilter("menipis")}>Stok menipis · {counts.menipis}</Chip>
          <Chip active={stockFilter === "habis"} tone="bad" onClick={() => setStockFilter("habis")}>Stok habis · {counts.habis}</Chip>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl lg:px-6 lg:py-4">
        {!cat ? <Spinner /> : rows.length === 0 ? (
          <Empty icon={<IconBox />} title={cat.items.length ? "Barang tidak ditemukan" : "Belum ada barang"}>
            {cat.items.length || !canEditMaster ? (cat.items.length ? "Coba kata kunci lain, kategori lain, atau ubah filter stok." : "Belum ada barang.") : <>Tambah barang satu per satu, atau <Link href="/impor" className="font-bold text-brand">impor dari Excel</Link> sekaligus.</>}
          </Empty>
        ) : (
          <div className="overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-line">
            <div className="flex justify-between px-4 pb-1.5 pt-2.5 text-xs font-semibold text-ink-muted">
              <span>NAMA BARANG</span><span>STOK</span>
            </div>
            {rows.map(({ it, qty, loc, status }) => {
              return (
                <Link key={it.id} href={`/barang/${it.id}`} className="flex items-center gap-3 border-t border-[#EEF0F3] px-4 py-3 active:bg-canvas lg:hover:bg-canvas">
                  <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#F2F4F7] text-[#98A2B3]">
                    {it.image_urls?.[0] ? <img src={it.image_urls[0]} alt="" className="h-full w-full bg-white object-contain" /> : <IconBox size={20} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{it.name}</span>
                      {it.is_active === false ? <span className="flex-none rounded-full bg-[#F2F4F7] px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">Nonaktif</span> : null}
                    </span>
                    <span className="truncate text-xs text-ink-muted">{[it.code, it.barcode].filter(Boolean).join(" · ") || "Tanpa kode"}{isOwner && cat.prices[it.id] ? ` · ${fmtRp(cat.prices[it.id].sell_price)}` : ""}</span>
                    {loc ? <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-indigo"><IconPin size={12} className="flex-none" /><span className="truncate">{loc}</span></span> : null}
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={cx("text-[15px] font-bold", status === "menipis" && "text-warn", status === "habis" && "text-danger")}>{fmtQty(qty)}</span>
                    <span className="text-[11px] text-ink-muted">{it.unit ?? ""}{it.min_qty ? ` · min ${fmtQty(it.min_qty)}` : ""}</span>
                  </span>
                </Link>
              );
            })}
            <div className="flex justify-between border-t border-line px-4 py-2.5 text-xs text-ink-muted">
              <span>{rows.length} barang</span><span>Total {fmtQty(totalUnits)} unit</span>
            </div>
          </div>
        )}
      </main>

      {canEditMaster ? <Link href="/barang/baru" aria-label="Tambah barang" className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand text-white shadow-lg lg:hidden"><IconPlus size={24} /></Link> : null}
    </>
  );
}

function Chip({ active, tone, onClick, children }: { active: boolean; tone?: "ok" | "warn" | "bad"; onClick: () => void; children: React.ReactNode }) {
  const styles = {
    none: ["border-ink bg-ink text-white", "border-line bg-white text-ink-2"],
    ok: ["border-brand bg-brand text-white", "border-line bg-white text-ink-2"],
    warn: ["border-warn bg-warn text-white", "border-[#F5C98B] bg-warn-soft text-warn"],
    bad: ["border-danger bg-danger text-white", "border-[#FECDCA] bg-danger-soft text-danger"],
  }[tone ?? "none"];
  return (
    <button onClick={onClick} aria-pressed={active}
      className={cx("h-9 flex-none whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold", active ? styles[0] : styles[1])}>
      {children}
    </button>
  );
}

/** Dropdown ringkas dengan label kecil di atas nilai (kategori & urutan). */
function MiniSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative flex h-11 min-w-0 flex-col justify-center rounded-xl2 border border-line bg-canvas pl-3 pr-7">
      <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-ink-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="mt-0.5 w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent text-[13px] font-semibold leading-tight outline-none">
        {children}
      </select>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5D6679" strokeWidth="2" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  );
}

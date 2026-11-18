"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { WarehousePicker } from "@/components/AppShell";
import { IconBox, IconDoc, IconDownload, IconPin, IconPlus, IconPrinter, IconScan, IconSearch, IconUpload } from "@/components/icons";
import { cx, Empty, Spinner, useToast } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { isLow, loadCatalog, locationLabel, qtyIn, type Catalog } from "@/lib/data";
import { downloadXlsx } from "@/lib/excel";
import { fmtQty, fmtRp } from "@/lib/format";

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
  const [filter, setFilter] = useState<string>(params.get("filter") ?? "all");

  useEffect(() => {
    if (!tenant) return;
    loadCatalog(tenant.id, isOwner).then(setCat).catch((e) => toast(String(e.message ?? e), "err"));
  }, [tenant, isOwner, toast]);

  const rows = useMemo(() => {
    if (!cat) return [];
    const term = q.trim().toLowerCase();
    return cat.items
      .map((it) => ({ it, qty: qtyIn(cat, it.id, whIds), loc: locationLabel(cat, it.id, whIds, warehouseNames) }))
      .filter(({ it, qty, loc }) => {
        if (filter === "menipis" && !isLow(it, qty)) return false;
        if (filter !== "all" && filter !== "menipis" && it.group_id !== filter) return false;
        if (!term) return true;
        return [it.name, it.code, it.barcode, loc].some((v) => v?.toLowerCase().includes(term));
      });
  }, [cat, q, filter, whIds, warehouseNames]);

  const lowCount = useMemo(() => cat ? cat.items.filter((it) => isLow(it, qtyIn(cat, it.id, whIds))).length : 0, [cat, whIds]);
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
          <div className="flex flex-1 gap-2">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl2 border border-line bg-canvas px-3">
              <IconSearch size={18} className="text-ink-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, barcode, lokasi" aria-label="Cari barang"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <button onClick={() => router.push("/scan?cari=1")} aria-label="Scan barcode untuk mencari" className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-brand text-white"><IconScan size={19} /></button>
          </div>
          <div className="lg:w-64"><WarehousePicker /></div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Semua · {cat?.items.length ?? 0}</Chip>
          <Chip active={filter === "menipis"} warn onClick={() => setFilter("menipis")}>Stok menipis · {lowCount}</Chip>
          {cat?.groups.map((g) => <Chip key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>{g.name}</Chip>)}
          {canEditMaster ? <Link href="/pengaturan/grup" className="flex h-9 flex-none items-center rounded-full border border-dashed border-line-strong px-3 text-[13px] font-semibold text-brand">Kelola grup</Link> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl lg:px-6 lg:py-4">
        {!cat ? <Spinner /> : rows.length === 0 ? (
          <Empty icon={<IconBox />} title={cat.items.length ? "Barang tidak ditemukan" : "Belum ada barang"}>
            {cat.items.length || !canEditMaster ? (cat.items.length ? "Coba kata kunci lain atau ubah filter." : "Belum ada barang.") : <>Tambah barang satu per satu, atau <Link href="/impor" className="font-bold text-brand">impor dari Excel</Link> sekaligus.</>}
          </Empty>
        ) : (
          <div className="overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-line">
            <div className="flex justify-between px-4 pb-1.5 pt-2.5 text-xs font-semibold text-ink-muted">
              <span>NAMA BARANG</span><span>STOK</span>
            </div>
            {rows.map(({ it, qty, loc }) => {
              const low = isLow(it, qty);
              return (
                <Link key={it.id} href={`/barang/${it.id}`} className="flex items-center gap-3 border-t border-[#EEF0F3] px-4 py-3 active:bg-canvas lg:hover:bg-canvas">
                  <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#F2F4F7] text-[#98A2B3]">
                    {it.image_urls?.[0] ? <img src={it.image_urls[0]} alt="" className="h-full w-full bg-white object-contain" /> : <IconBox size={20} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{it.name}</span>
                    <span className="truncate text-xs text-ink-muted">{[it.code, it.barcode].filter(Boolean).join(" · ") || "Tanpa kode"}{isOwner && cat.prices[it.id] ? ` · ${fmtRp(cat.prices[it.id].sell_price)}` : ""}</span>
                    {loc ? <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-indigo"><IconPin size={12} className="flex-none" /><span className="truncate">{loc}</span></span> : null}
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={cx("text-[15px] font-bold", low && "text-warn")}>{fmtQty(qty)}</span>
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

function Chip({ active, warn, onClick, children }: { active: boolean; warn?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cx("h-9 flex-none whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold",
        active ? (warn ? "border-warn bg-warn text-white" : "border-ink bg-ink text-white") : warn ? "border-[#F5C98B] bg-warn-soft text-warn" : "border-line bg-white text-ink-2")}>
      {children}
    </button>
  );
}

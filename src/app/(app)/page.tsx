"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WarehousePicker } from "@/components/AppShell";
import { IconAlert, IconCheckList, IconChevron, IconIn, IconChart, IconDoc, IconOut, IconPrinter, IconScan, IconTransfer, IconTruck, IconUpload } from "@/components/icons";
import { Badge, Spinner } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { ROLE_LABEL } from "@/lib/access";
import { isLow, loadCatalog, qtyIn, type Catalog } from "@/lib/data";
import { fmtDate, fmtQty, fmtRpShort } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { DOC_LABEL, STATUS_LABEL, type DocumentRow } from "@/lib/types";

export default function BerandaPage() {
  const { tenant, isOwner, isSupervisor, role, session, warehouseNames, warehouses } = useApp();
  const whIds = useActiveWarehouseIds();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [incoming, setIncoming] = useState<DocumentRow[]>([]);
  const [recent, setRecent] = useState<DocumentRow[]>([]);

  useEffect(() => {
    if (!tenant) return;
    let alive = true;
    const sb = supabase();
    (async () => {
      const [c, inc, rec] = await Promise.all([
        loadCatalog(tenant.id, isOwner),
        sb.from("documents").select("*").eq("tenant_id", tenant.id).eq("doc_type", "transfer").eq("status", "in_transit").order("posted_at", { ascending: false }).limit(20),
        sb.from("documents").select("*").eq("tenant_id", tenant.id).neq("status", "void").order("created_at", { ascending: false }).limit(6),
      ]);
      if (!alive) return;
      setCat(c);
      setIncoming((inc.data ?? []) as DocumentRow[]);
      setRecent((rec.data ?? []) as DocumentRow[]);
    })();
    return () => { alive = false; };
  }, [tenant, isOwner]);

  const stats = useMemo(() => {
    if (!cat) return null;
    let units = 0, value = 0;
    const low: { id: string; name: string; qty: number; min: number; unit: string }[] = [];
    for (const it of cat.items) {
      const q = qtyIn(cat, it.id, whIds);
      units += q;
      value += q * (cat.prices[it.id]?.purchase_price ?? 0);
      if (isLow(it, q)) low.push({ id: it.id, name: it.name, qty: q, min: Number(it.min_qty), unit: it.unit ?? "" });
    }
    low.sort((a, b) => a.qty / a.min - b.qty / b.min);
    return { units, value, low, count: cat.items.length };
  }, [cat, whIds]);

  const myIncoming = incoming.filter((d) => d.to_warehouse_id && whIds.includes(d.to_warehouse_id));
  const myOutgoing = incoming.filter((d) => d.from_warehouse_id && whIds.includes(d.from_warehouse_id) && !myIncoming.includes(d));
  const firstName = session?.user.email?.split("@")[0] ?? "";

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-line bg-white px-4 pb-3 pt-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-2.5 lg:hidden">
          <img src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
          <div className="flex flex-col">
            <span className="text-[17px] font-bold">{tenant?.name}</span>
            <span className="text-xs text-ink-muted">Halo, {firstName} · {role ? ROLE_LABEL[role] : ""}</span>
          </div>
        </div>
        <h1 className="hidden text-2xl font-bold lg:block">Ringkasan</h1>
        <div className="lg:w-72"><WarehousePicker /></div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 lg:px-6">
        {!stats ? <Spinner /> : (
          <>
            <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {isOwner ? (
                <div className="flex flex-col gap-1 rounded-2xl bg-brand p-3.5 text-white">
                  <span className="text-xs opacity-90">Nilai persediaan</span>
                  <span className="text-xl font-bold tracking-tight">{fmtRpShort(stats.value)}</span>
                  <span className="text-xs opacity-90">harga beli × stok</span>
                </div>
              ) : null}
              <div className={isOwner ? "flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5" : "flex flex-col gap-1 rounded-2xl bg-brand p-3.5 text-white"}>
                <span className={isOwner ? "text-xs text-ink-muted" : "text-xs opacity-90"}>Total stok</span>
                <span className="text-xl font-bold tracking-tight">{fmtQty(stats.units)} unit</span>
                <span className={isOwner ? "text-xs text-ink-muted" : "text-xs opacity-90"}>{stats.count} barang</span>
              </div>
              <Link href="/barang?filter=menipis" className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5">
                <span className="text-xs text-ink-muted">Stok menipis</span>
                <span className={stats.low.length ? "text-xl font-bold text-warn" : "text-xl font-bold"}>{stats.low.length} barang</span>
                <span className="text-xs text-ink-muted">di bawah minimum</span>
              </Link>
              <div className="hidden flex-col gap-1 rounded-2xl border border-line bg-white p-3.5 lg:flex">
                <span className="text-xs text-ink-muted">Transfer masuk</span>
                <span className="text-xl font-bold">{myIncoming.length}</span>
                <span className="text-xs text-ink-muted">menunggu diterima</span>
              </div>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-[15px] font-bold">Transaksi cepat</h2>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <Tile href="/dokumen/baru?jenis=in" label="Barang masuk" icon={<IconIn />} tone="bg-brand-soft text-brand" />
                <Tile href="/dokumen/baru?jenis=out" label="Barang keluar" icon={<IconOut />} tone="bg-warn-soft text-warn" />
                {Object.keys(warehouseNames).length > 1 || isOwner ? <Tile href="/transfer/baru" label="Transfer gudang" icon={<IconTransfer />} tone="bg-indigo-soft text-indigo" /> : null}
                <Tile href="/dokumen/baru?jenis=opname" label="Stok opname" icon={<IconCheckList />} tone="bg-[#F2F4F7] text-ink-2" />
                {!isSupervisor ? <>
                  <Tile href="/impor" label="Impor Excel" icon={<IconUpload />} tone="bg-[#F2F4F7] text-ink-2" />
                  <Tile href="/barang/label" label="Cetak label" icon={<IconPrinter />} tone="bg-[#F2F4F7] text-ink-2" />
                  <Tile href="/barang/katalog" label="Katalog digital" icon={<IconDoc />} tone="bg-brand-soft text-brand" />
                  <Tile href="/laporan?tab=mutasi" label="Mutasi barang" icon={<IconChart />} tone="bg-indigo-soft text-indigo" />
                </> : <Tile href="/scan" label="Scan barang" icon={<IconScan />} tone="bg-brand-soft text-brand" />}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-white px-4 pb-1 pt-2">
                <div className="flex items-center justify-between py-2">
                  <h2 className="text-[15px] font-bold">Perlu perhatian</h2>
                  <Link href="/barang?filter=menipis" className="text-[13px] font-semibold text-brand">Lihat semua</Link>
                </div>
                {myIncoming.map((d) => (
                  <Row key={d.id} href={`/dokumen/${d.id}`} icon={<IconTruck size={18} />} tone="bg-indigo-soft text-indigo"
                    title={`${d.number} menunggu diterima`} sub={`${warehouseNames[d.from_warehouse_id ?? ""] ?? "Gudang lain"} → ${warehouseNames[d.to_warehouse_id ?? ""] ?? "-"}`} />
                ))}
                {myOutgoing.map((d) => (
                  <Row key={d.id} href={`/dokumen/${d.id}`} icon={<IconTruck size={18} />} tone="bg-[#F2F4F7] text-ink-3"
                    title={`${d.number} dalam perjalanan`} sub={`${warehouseNames[d.from_warehouse_id ?? ""] ?? "-"} → ${warehouseNames[d.to_warehouse_id ?? ""] ?? "Gudang lain"}`} />
                ))}
                {stats.low.slice(0, 5).map((l) => (
                  <Row key={l.id} href={`/barang/${l.id}`} icon={<IconAlert size={18} />} tone="bg-warn-soft text-warn"
                    title={l.name} sub={`Sisa ${fmtQty(l.qty)} ${l.unit} · minimum ${fmtQty(l.min)}`} />
                ))}
                {myIncoming.length + myOutgoing.length + stats.low.length === 0 ? (
                  <p className="border-t border-[#EEF0F3] py-4 text-sm text-ink-muted">Semua aman. Tidak ada transfer tertunda atau stok menipis.</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-line bg-white px-4 pb-1 pt-2">
                <div className="flex items-center justify-between py-2">
                  <h2 className="text-[15px] font-bold">Dokumen terbaru</h2>
                  <Link href="/dokumen" className="text-[13px] font-semibold text-brand">Semua dokumen</Link>
                </div>
                {recent.length === 0 ? <p className="border-t border-[#EEF0F3] py-4 text-sm text-ink-muted">Belum ada dokumen. Mulai dari impor Excel atau barang masuk.</p> : null}
                {recent.map((d) => (
                  <Link key={d.id} href={`/dokumen/${d.id}`} className="flex items-center gap-3 border-t border-[#EEF0F3] py-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{d.number} · {DOC_LABEL[d.doc_type]}</span>
                      <span className="truncate text-xs text-ink-muted">{fmtDate(d.doc_date)} · {d.doc_type === "transfer" ? `${warehouseNames[d.from_warehouse_id ?? ""] ?? "-"} → ${warehouseNames[d.to_warehouse_id ?? ""] ?? "-"}` : warehouseNames[d.warehouse_id ?? ""]}</span>
                    </span>
                    <Badge tone={d.status === "draft" ? "gray" : d.status === "in_transit" ? "indigo" : "green"}>{STATUS_LABEL[d.status]}</Badge>
                  </Link>
                ))}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Tile({ href, label, icon, tone }: { href: string; label: string; icon: React.ReactNode; tone: string }) {
  return (
    <Link href={href} className="flex min-h-[92px] flex-col items-start gap-2.5 rounded-2xl border border-line bg-white p-3.5 text-sm font-semibold active:bg-canvas">
      <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${tone}`}>{icon}</span>{label}
    </Link>
  );
}

function Row({ href, icon, tone, title, sub }: { href: string; icon: React.ReactNode; tone: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 border-t border-[#EEF0F3] py-3">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${tone}`}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="truncate text-xs text-ink-muted">{sub}</span>
      </span>
      <IconChevron size={18} className="text-[#98A2B3]" />
    </Link>
  );
}

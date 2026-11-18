"use client";

import { useEffect, useMemo, useState } from "react";
import { WarehousePicker } from "@/components/AppShell";
import MutasiReport from "@/components/MutasiReport";
import DeadStockReport from "@/components/DeadStockReport";
import { IconDownload } from "@/components/icons";
import { Card, cx, Input, PageHeader, Spinner } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { fetchAll, loadCatalog, qtyIn, type Catalog } from "@/lib/data";
import { downloadXlsx } from "@/lib/excel";
import { fmtDateTime, fmtQty, fmtRp, fmtRpShort, todayISO } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type Tab = "stok" | "mutasi" | "mati" | "gerak" | "transfer" | "jual";

interface Move { item_id: string; warehouse_id: string; movement_type: string; qty_delta: number; created_at: string; document_id: string | null }
interface TrfLine { qty: number; qty_received: number | null; item_id: string; documents: { number: string; from_warehouse_id: string; to_warehouse_id: string; received_at: string | null; status: string } }
interface SaleLine { id: string; qty: number; item_id: string; documents: { warehouse_id: string; doc_date: string; status: string; doc_type: string } }

const MOVE: Record<string, string> = { in: "Masuk", out: "Keluar", return_in: "Retur masuk", return_out: "Retur keluar", opname_adjust: "Opname", transfer_out: "Transfer keluar", transfer_in: "Transfer masuk", void_reversal: "Pembatalan" };

function monthStart() { return todayISO().slice(0, 8) + "01"; }

export default function LaporanPage() {
  const { tenant, isOwner, warehouses, warehouseNames } = useApp();
  const whIds = useActiveWarehouseIds();
  const [tab, setTab] = useState<Tab>("stok");
  const [cat, setCat] = useState<Catalog | null>(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [trf, setTrf] = useState<TrfLine[] | null>(null);
  const [sales, setSales] = useState<{ lines: SaleLine[]; prices: Record<string, number> } | null>(null);

  useEffect(() => { if (tenant) loadCatalog(tenant.id, isOwner).then(setCat); }, [tenant, isOwner]);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && ["stok", "mutasi", "mati", "gerak", "transfer", "jual"].includes(t)) setTab(t);
  }, []);

  useEffect(() => {
    if (!tenant) return;
    const sb = supabase();
    const end = `${to}T23:59:59`;
    if (tab === "gerak") {
      setMoves(null);
      sb.from("stock_movements").select("item_id, warehouse_id, movement_type, qty_delta, created_at, document_id").eq("tenant_id", tenant.id)
        .gte("created_at", from).lte("created_at", end).order("created_at", { ascending: false }).limit(1000)
        .then(({ data }) => setMoves((data ?? []) as Move[]));
    }
    if (tab === "transfer") {
      setTrf(null);
      sb.from("document_lines").select("qty, qty_received, item_id, documents!inner(number, from_warehouse_id, to_warehouse_id, received_at, status, doc_type, doc_date)")
        .eq("tenant_id", tenant.id).eq("documents.doc_type", "transfer").eq("documents.status", "received").gte("documents.doc_date", from).lte("documents.doc_date", to).limit(2000)
        .then(({ data }) => setTrf((data ?? []) as unknown as TrfLine[]));
    }
    if (tab === "jual" && isOwner) {
      setSales(null);
      (async () => {
        const lines = await fetchAll<SaleLine>((a, b) => sb.from("document_lines").select("id, qty, item_id, documents!inner(warehouse_id, doc_date, status, doc_type)")
          .eq("tenant_id", tenant.id).eq("documents.doc_type", "out").eq("documents.status", "posted").gte("documents.doc_date", from).lte("documents.doc_date", to).range(a, b) as unknown as PromiseLike<{ data: SaleLine[] | null; error: unknown }>);
        const prices: Record<string, number> = {};
        for (let i = 0; i < lines.length; i += 300) {
          const { data } = await sb.from("document_line_prices").select("line_id, unit_price").in("line_id", lines.slice(i, i + 300).map((l) => l.id));
          for (const p of (data ?? []) as { line_id: string; unit_price: number }[]) prices[p.line_id] = Number(p.unit_price);
        }
        setSales({ lines, prices });
      })();
    }
  }, [tenant, tab, from, to, isOwner]);

  const itemName = useMemo(() => Object.fromEntries((cat?.items ?? []).map((i) => [i.id, i.name])), [cat]);
  const shownWh = warehouses.filter((w) => whIds.includes(w.id));

  const stockRows = useMemo(() => {
    if (!cat) return [];
    return cat.items.map((it) => {
      const per = Object.fromEntries(shownWh.map((w) => [w.id, cat.stock[it.id]?.[w.id] ?? 0]));
      const total = qtyIn(cat, it.id, whIds);
      return { it, per, total, value: total * (cat.prices[it.id]?.purchase_price ?? 0) };
    });
  }, [cat, shownWh, whIds]);

  const salesSummary = useMemo(() => {
    if (!sales || !cat) return null;
    let omzet = 0, hpp = 0;
    const byItem: Record<string, { qty: number; omzet: number }> = {};
    for (const l of sales.lines) {
      if (!whIds.includes(l.documents.warehouse_id)) continue;
      const rev = Number(l.qty) * (sales.prices[l.id] ?? 0);
      omzet += rev;
      hpp += Number(l.qty) * (cat.prices[l.item_id]?.purchase_price ?? 0);
      const b = (byItem[l.item_id] ??= { qty: 0, omzet: 0 });
      b.qty += Number(l.qty); b.omzet += rev;
    }
    return { omzet, hpp, laba: omzet - hpp, top: Object.entries(byItem).sort((a, b) => b[1].omzet - a[1].omzet).slice(0, 20) };
  }, [sales, cat, whIds]);

  async function exportStock() {
    await downloadXlsx("laporan-stok.xlsx", [{
      name: "Stok",
      columns: [{ header: "Barang", key: "name", width: 32 }, { header: "Kode", key: "code" }, ...shownWh.map((w) => ({ header: w.name, key: w.id })), { header: "Total", key: "total" }, ...(isOwner ? [{ header: "Nilai (harga beli)", key: "value", width: 18 }] : [])],
      rows: stockRows.map((r) => ({ name: r.it.name, code: r.it.code ?? "", ...r.per, total: r.total, value: r.value })),
    }]);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "stok", label: "Stok" }, { key: "mutasi", label: "Mutasi barang" }, { key: "mati", label: "Tidak bergerak" }, { key: "gerak", label: "Pergerakan" }, { key: "transfer", label: "Selisih transfer" },
    ...(isOwner ? [{ key: "jual" as Tab, label: "Penjualan & laba" }] : []),
  ];

  return (
    <>
      <PageHeader title="Laporan" right={<div className="w-44 lg:w-64"><WarehousePicker /></div>} />
      <div className="sticky top-16 z-10 flex gap-1 overflow-x-auto border-b border-line bg-white px-4 lg:px-6">
        {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cx("h-11 flex-none border-b-2 px-3 text-sm font-semibold", tab === t.key ? "border-brand text-brand" : "border-transparent text-ink-muted")}>{t.label}</button>)}
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 lg:px-6">
        {tab !== "stok" && tab !== "mati" ? (
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-3">Dari<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-3">Sampai<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        ) : null}

        {tab === "stok" ? (!cat ? <Spinner /> : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">{stockRows.length} barang{isOwner ? ` · nilai ${fmtRpShort(stockRows.reduce((s, r) => s + r.value, 0))}` : ""}</p>
              <button onClick={exportStock} className="flex h-10 items-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-[13px] font-bold text-brand"><IconDownload size={16} />Excel</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm" style={{ minWidth: 180 + (shownWh.length + (isOwner ? 2 : 1)) * 96 }}>
                <thead><tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th className="px-3 py-2.5 font-semibold">Barang</th>
                  {shownWh.map((w) => <th key={w.id} className="px-3 py-2.5 text-right font-semibold">{w.name}</th>)}
                  <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                  {isOwner ? <th className="px-3 py-2.5 text-right font-semibold">Nilai</th> : null}
                </tr></thead>
                <tbody>{stockRows.map((r) => (
                  <tr key={r.it.id} className="border-b border-[#EEF0F3]">
                    <td className="px-3 py-2.5 font-semibold">{r.it.name}</td>
                    {shownWh.map((w) => <td key={w.id} className="px-3 py-2.5 text-right">{fmtQty(r.per[w.id])}</td>)}
                    <td className="px-3 py-2.5 text-right font-bold">{fmtQty(r.total)}</td>
                    {isOwner ? <td className="px-3 py-2.5 text-right">{fmtRp(r.value)}</td> : null}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )) : null}

        {tab === "mutasi" ? (!cat || !tenant ? <Spinner /> : <MutasiReport cat={cat} whIds={whIds} from={from} to={to} warehouseNames={warehouseNames} tenantId={tenant.id} />) : null}

        {tab === "mati" ? (!cat || !tenant ? <Spinner /> : <DeadStockReport cat={cat} whIds={whIds} tenantId={tenant.id} isOwner={isOwner} warehouseNames={warehouseNames} />) : null}

        {tab === "gerak" ? (!moves ? <Spinner /> : (
          <Card className="flex flex-col p-0">
            {moves.filter((m) => whIds.includes(m.warehouse_id)).length === 0 ? <p className="p-4 text-sm text-ink-muted">Tidak ada pergerakan stok di periode ini.</p> : null}
            {moves.filter((m) => whIds.includes(m.warehouse_id)).map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-[#EEF0F3] px-4 py-2.5 text-sm last:border-b-0">
                <span className="flex min-w-0 flex-col"><span className="truncate font-semibold">{itemName[m.item_id] ?? "Barang"}</span><span className="text-xs text-ink-muted">{MOVE[m.movement_type]} · {warehouseNames[m.warehouse_id]} · {fmtDateTime(m.created_at)}</span></span>
                <span className={Number(m.qty_delta) >= 0 ? "font-bold text-brand" : "font-bold text-warn"}>{Number(m.qty_delta) >= 0 ? "+" : ""}{fmtQty(m.qty_delta)}</span>
              </div>
            ))}
          </Card>
        )) : null}

        {tab === "transfer" ? (!trf ? <Spinner /> : (() => {
          const diff = trf.filter((l) => Number(l.qty_received ?? l.qty) < Number(l.qty) && (whIds.includes(l.documents.from_warehouse_id) || whIds.includes(l.documents.to_warehouse_id)));
          return (
            <Card className="flex flex-col p-0">
              {diff.length === 0 ? <p className="p-4 text-sm text-ink-muted">Tidak ada selisih transfer di periode ini.</p> : null}
              {diff.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-[#EEF0F3] px-4 py-2.5 text-sm last:border-b-0">
                  <span className="flex min-w-0 flex-col"><span className="truncate font-semibold">{itemName[l.item_id]} · {l.documents.number}</span><span className="text-xs text-ink-muted">{warehouseNames[l.documents.from_warehouse_id] ?? "Gudang lain"} → {warehouseNames[l.documents.to_warehouse_id] ?? "Gudang lain"} · dikirim {fmtQty(l.qty)}, diterima {fmtQty(l.qty_received)}</span></span>
                  <span className="font-bold text-warn">−{fmtQty(Number(l.qty) - Number(l.qty_received))}</span>
                </div>
              ))}
            </Card>
          );
        })()) : null}

        {tab === "jual" && isOwner ? (!salesSummary ? <Spinner /> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3"><span className="text-xs text-ink-muted">Omzet</span><p className="text-lg font-bold">{fmtRpShort(salesSummary.omzet)}</p></Card>
              <Card className="p-3"><span className="text-xs text-ink-muted">Harga pokok</span><p className="text-lg font-bold">{fmtRpShort(salesSummary.hpp)}</p></Card>
              <Card className="p-3"><span className="text-xs text-ink-muted">Laba kotor</span><p className={cx("text-lg font-bold", salesSummary.laba < 0 && "text-danger")}>{fmtRpShort(salesSummary.laba)}</p></Card>
            </div>
            <p className="text-xs text-ink-muted">Dihitung dari dokumen Barang keluar yang diposting. Harga pokok memakai harga beli barang saat ini. Transfer antar gudang tidak dihitung sebagai omzet.</p>
            <Card className="flex flex-col p-0">
              <h2 className="px-4 pb-1 pt-3 text-sm font-bold">Barang terlaris</h2>
              {salesSummary.top.length === 0 ? <p className="px-4 pb-4 text-sm text-ink-muted">Belum ada penjualan di periode ini.</p> : null}
              {salesSummary.top.map(([id, v]) => (
                <div key={id} className="flex items-center justify-between border-t border-[#EEF0F3] px-4 py-2.5 text-sm">
                  <span className="font-semibold">{itemName[id]}</span><span>{fmtQty(v.qty)} · <b>{fmtRp(v.omzet)}</b></span>
                </div>
              ))}
            </Card>
          </>
        )) : null}
      </div>
    </>
  );
}

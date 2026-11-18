"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconDownload, IconPin } from "./icons";
import { Card, cx, Input, Spinner } from "./ui";
import { locationLabel, qtyIn, type Catalog } from "@/lib/data";
import { downloadXlsx } from "@/lib/excel";
import { fmtDate, fmtQty, fmtRp, fmtRpShort, todayISO } from "@/lib/format";
import { supabase } from "@/lib/supabase";

interface LastMove { item_id: string; warehouse_id: string; last_out: string | null; last_in: string | null; last_any: string | null }
type Mode = "keluar" | "semua";

const PRESETS = [30, 60, 90, 180, 365];
const DAY = 86400000;

function daysAgoISO(n: number) {
  const d = new Date(Date.now() - n * DAY);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const maxDate = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * Barang tidak bergerak (dead stock): masih ada stok, tapi tidak ada barang keluar
 * (atau tidak ada pergerakan sama sekali) sejak tanggal tertentu.
 */
export default function DeadStockReport({ cat, whIds, tenantId, isOwner, warehouseNames }: { cat: Catalog; whIds: string[]; tenantId: string; isOwner: boolean; warehouseNames: Record<string, string> }) {
  const [moves, setMoves] = useState<LastMove[] | null>(null);
  const [days, setDays] = useState<number | null>(90);
  const [since, setSince] = useState(daysAgoISO(90));
  const [mode, setMode] = useState<Mode>("keluar");
  const [q, setQ] = useState("");

  useEffect(() => {
    setMoves(null);
    supabase().rpc("item_last_moves", { p_tenant: tenantId }).then(({ data }) => setMoves((data ?? []) as LastMove[]));
  }, [tenantId]);

  const rows = useMemo(() => {
    if (!moves) return [];
    const by: Record<string, { out: string | null; inn: string | null; any: string | null }> = {};
    for (const m of moves) {
      if (!whIds.includes(m.warehouse_id)) continue;
      const b = (by[m.item_id] ??= { out: null, inn: null, any: null });
      b.out = maxDate(b.out, m.last_out); b.inn = maxDate(b.inn, m.last_in); b.any = maxDate(b.any, m.last_any);
    }
    const cutoff = new Date(`${since}T00:00:00`).getTime();
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    return cat.items
      .filter((it) => it.is_active !== false)
      .map((it) => {
        const qty = qtyIn(cat, it.id, whIds);
        const m = by[it.id] ?? { out: null, inn: null, any: null };
        const ref = mode === "keluar" ? m.out : m.any;
        const idleFrom = ref ?? m.inn ?? m.any;
        return { it, qty, ...m, ref, idle: idleFrom ? Math.floor((now - new Date(idleFrom).getTime()) / DAY) : null, value: qty * (cat.prices[it.id]?.purchase_price ?? 0) };
      })
      .filter((r) => r.qty > 0 && (!r.ref || new Date(r.ref).getTime() < cutoff))
      .filter((r) => !needle || r.it.name.toLowerCase().includes(needle) || (r.it.code ?? "").toLowerCase().includes(needle))
      .sort((a, b) => (b.idle ?? 1e9) - (a.idle ?? 1e9) || b.value - a.value);
  }, [moves, cat, whIds, since, mode, q]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const allStocked = cat.items.filter((it) => qtyIn(cat, it.id, whIds) > 0).length;

  function pick(n: number) { setDays(n); setSince(daysAgoISO(n)); }

  async function exportXlsx() {
    await downloadXlsx(`barang-tidak-bergerak-${todayISO()}.xlsx`, [{
      name: "Tidak bergerak",
      columns: [
        { header: "Barang", key: "name", width: 34 }, { header: "Kode", key: "code" }, { header: "Lokasi", key: "loc", width: 24 },
        { header: "Stok", key: "qty" }, { header: "Satuan", key: "unit" },
        { header: "Terakhir keluar", key: "out", width: 16 }, { header: "Terakhir masuk", key: "inn", width: 16 }, { header: "Hari diam", key: "idle" },
        ...(isOwner ? [{ header: "Nilai (harga beli)", key: "value", width: 18 }] : []),
      ],
      rows: rows.map((r) => ({
        name: r.it.name, code: r.it.code ?? "", loc: locationLabel(cat, r.it.id, whIds, warehouseNames), qty: r.qty, unit: r.it.unit ?? "",
        out: r.out ? fmtDate(r.out) : "Belum pernah", inn: r.inn ? fmtDate(r.inn) : "-", idle: r.idle ?? "", value: r.value,
      })),
    }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-ink-3">Tidak bergerak selama</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((n) => (
              <button key={n} type="button" onClick={() => pick(n)} className={cx("h-9 rounded-full border px-3 text-[13px] font-semibold", days === n ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-ink-2")}>
                {n >= 365 ? "1 tahun" : `${n} hari`}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-3">
            atau sejak tanggal
            <Input type="date" className="h-10 max-w-[170px]" value={since} max={todayISO()} onChange={(e) => { setSince(e.target.value); setDays(null); }} />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-ink-3">Dihitung tidak bergerak jika</span>
          <div className="grid grid-cols-2 gap-1.5">
            {([["keluar", "Tidak ada barang keluar", "Penjualan, transfer keluar, retur ke pemasok"], ["semua", "Tidak ada pergerakan sama sekali", "Termasuk barang masuk & opname"]] as [Mode, string, string][]).map(([k, l, h]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={cx("flex flex-col rounded-xl2 border px-3 py-2 text-left text-[13px]", mode === k ? "border-brand bg-brand-soft font-bold text-brand" : "border-line-strong")}>
                {l}<span className="text-[11px] font-normal text-ink-muted">{h}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {!moves ? <Spinner /> : (
        <>
          <div className={cx("grid gap-2", isOwner ? "grid-cols-3" : "grid-cols-2")}>
            <Card className="p-3"><span className="text-xs text-ink-muted">Barang tidak bergerak</span><p className="text-lg font-bold text-warn">{rows.length}<span className="text-xs font-semibold text-ink-muted"> / {allStocked} berstok</span></p></Card>
            <Card className="p-3"><span className="text-xs text-ink-muted">Total stok diam</span><p className="text-lg font-bold">{fmtQty(totalQty)}</p></Card>
            {isOwner ? <Card className="p-3"><span className="text-xs text-ink-muted">Modal tertahan</span><p className="text-lg font-bold">{fmtRpShort(totalValue)}</p></Card> : null}
          </div>

          <div className="flex items-center gap-2">
            <Input placeholder="Cari barang…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
            <button onClick={exportXlsx} disabled={!rows.length} className="flex h-12 items-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-[13px] font-bold text-brand disabled:opacity-50"><IconDownload size={16} />Excel</button>
          </div>

          <Card className="flex flex-col p-0">
            {rows.length === 0 ? <p className="p-4 text-sm text-ink-muted">Semua barang berstok sudah bergerak sejak {fmtDate(since)}. Mantap!</p> : null}
            {rows.map((r) => {
              const loc = locationLabel(cat, r.it.id, whIds, warehouseNames);
              return (
                <Link key={r.it.id} href={`/barang/${r.it.id}`} className="flex items-center justify-between gap-3 border-b border-[#EEF0F3] px-4 py-3 text-sm last:border-b-0 active:bg-canvas">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">{r.it.name}</span>
                    <span className="text-xs text-ink-muted">
                      {mode === "keluar"
                        ? (r.out ? `Terakhir keluar ${fmtDate(r.out)}` : `Belum pernah keluar${r.inn ? ` · masuk ${fmtDate(r.inn)}` : ""}`)
                        : (r.any ? `Terakhir bergerak ${fmtDate(r.any)}` : "Belum pernah bergerak")}
                      {isOwner && r.value ? ` · ${fmtRp(r.value)}` : ""}
                    </span>
                    {loc ? <span className="flex items-center gap-1 text-xs font-semibold text-indigo"><IconPin size={12} className="flex-none" /><span className="truncate">{loc}</span></span> : null}
                  </span>
                  <span className="flex flex-none flex-col items-end">
                    <span className="font-bold">{fmtQty(r.qty)} {r.it.unit ?? ""}</span>
                    <span className={cx("text-xs font-semibold", (r.idle ?? 999) >= 180 ? "text-danger" : "text-warn")}>{r.idle !== null ? `${r.idle} hari diam` : "tanpa riwayat"}</span>
                  </span>
                </Link>
              );
            })}
          </Card>
          <p className="text-xs text-ink-muted">Hanya barang yang masih punya stok di gudang terpilih. Dokumen yang dibatalkan tidak dihitung. Ketuk barang untuk melihat detailnya.</p>
        </>
      )}
    </div>
  );
}

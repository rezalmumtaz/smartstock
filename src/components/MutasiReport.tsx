"use client";

import { useEffect, useMemo, useState } from "react";
import { IconDownload, IconSearch } from "./icons";
import { cx, Select, Spinner, useToast } from "./ui";
import { fetchAll, qtyIn, type Catalog } from "@/lib/data";
import { downloadXlsx } from "@/lib/excel";
import { fmtDate, fmtDateTime, fmtQty } from "@/lib/format";
import { errorMessage, supabase } from "@/lib/supabase";

interface Move { item_id: string; warehouse_id: string; movement_type: string; qty_delta: number; created_at: string; document_id: string | null }
const IN_TYPES = ["in", "return_in", "transfer_in"];
const OUT_TYPES = ["out", "return_out", "transfer_out"];
const LABEL: Record<string, string> = { in: "Barang masuk", return_in: "Retur dari pelanggan", transfer_in: "Transfer masuk", out: "Barang keluar", return_out: "Retur ke pemasok", transfer_out: "Transfer keluar", opname_adjust: "Penyesuaian opname", void_reversal: "Pembatalan dokumen" };

export interface MutasiRow {
  id: string; name: string; code: string | null; unit: string | null; group: string;
  awal: number; masuk: number; keluar: number; sesuai: number; akhir: number;
  detail: Record<string, number>; moves: Move[];
}

/**
 * Mutasi per barang untuk periode [from, to] di gudang terpilih.
 * Saldo akhir = stok sekarang − pergerakan setelah periode; saldo awal = saldo akhir − pergerakan di periode.
 */
export default function MutasiReport({ cat, whIds, from, to, warehouseNames, tenantId }: { cat: Catalog; whIds: string[]; from: string; to: string; warehouseNames: Record<string, string>; tenantId: string }) {
  const toast = useToast();
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [onlyMoving, setOnlyMoving] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!whIds.length) { setMoves([]); return; }
    setMoves(null);
    const sb = supabase();
    fetchAll<Move>((a, b) => sb.from("stock_movements").select("item_id, warehouse_id, movement_type, qty_delta, created_at, document_id")
      .eq("tenant_id", tenantId).in("warehouse_id", whIds).gte("created_at", `${from}T00:00:00`).order("created_at").range(a, b))
      .then(setMoves).catch((e) => toast(errorMessage(e), "err"));
  }, [tenantId, whIds.join(","), from]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupName = useMemo(() => Object.fromEntries(cat.groups.map((g) => [g.id, g.name])), [cat]);

  const rows = useMemo<MutasiRow[]>(() => {
    if (!moves) return [];
    const endTs = new Date(`${to}T23:59:59.999`).getTime();
    const by: Record<string, Move[]> = {};
    for (const m of moves) (by[m.item_id] ??= []).push(m);
    return cat.items.map((it) => {
      const list = by[it.id] ?? [];
      let after = 0, masuk = 0, keluar = 0, sesuai = 0;
      const detail: Record<string, number> = {};
      const inPeriod: Move[] = [];
      for (const m of list) {
        const d = Number(m.qty_delta);
        if (new Date(m.created_at).getTime() > endTs) { after += d; continue; }
        inPeriod.push(m);
        detail[m.movement_type] = (detail[m.movement_type] ?? 0) + d;
        if (IN_TYPES.includes(m.movement_type)) masuk += d;
        else if (OUT_TYPES.includes(m.movement_type)) keluar += -d;
        else sesuai += d;
      }
      const akhir = qtyIn(cat, it.id, whIds) - after;
      const awal = akhir - (masuk - keluar + sesuai);
      return { id: it.id, name: it.name, code: it.code, unit: it.unit, group: it.group_id ? groupName[it.group_id] ?? "" : "", awal, masuk, keluar, sesuai, akhir, detail, moves: inPeriod.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
    });
  }, [moves, cat, whIds, to, groupName]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (!onlyMoving || r.moves.length > 0)
      && (group === "all" || (group === "none" ? !r.group : cat.items.find((i) => i.id === r.id)?.group_id === group))
      && (!term || r.name.toLowerCase().includes(term) || r.code?.toLowerCase().includes(term)));
  }, [rows, q, group, onlyMoving, cat]);

  const total = shown.reduce((s, r) => ({ masuk: s.masuk + r.masuk, keluar: s.keluar + r.keluar }), { masuk: 0, keluar: 0 });

  async function exportExcel() {
    const whLabel = whIds.map((w) => warehouseNames[w]).filter(Boolean).join(", ");
    await downloadXlsx(`mutasi-barang-${from}-sd-${to}.xlsx`, [{
      name: "Mutasi",
      columns: [
        { header: "Nama barang", key: "name", width: 32 }, { header: "Kode", key: "code" }, { header: "Grup", key: "group" }, { header: "Satuan", key: "unit" },
        { header: "Stok awal", key: "awal" }, { header: "Masuk", key: "masuk" }, { header: "Keluar", key: "keluar" }, { header: "Penyesuaian", key: "sesuai" }, { header: "Stok akhir", key: "akhir" },
        { header: "Gudang", key: "wh", width: 28 }, { header: "Periode", key: "periode", width: 24 },
      ],
      rows: shown.map((r) => ({ ...r, code: r.code ?? "", unit: r.unit ?? "", wh: whLabel, periode: `${fmtDate(from)} – ${fmtDate(to)}` })),
    }]);
  }

  if (!moves) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row">
        <label className="flex h-11 min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl2 border border-line-strong bg-white px-3">
          <IconSearch size={18} className="text-ink-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari barang" aria-label="Cari barang" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <div className="flex gap-2">
          <Select aria-label="Grup barang" value={group} onChange={(e) => setGroup(e.target.value)} className="h-11 flex-1 lg:w-48">
            <option value="all">Semua grup</option>
            {cat.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            <option value="none">Tanpa grup</option>
          </Select>
          <button onClick={exportExcel} className="flex h-11 flex-none items-center gap-1.5 rounded-xl2 border border-line-strong bg-white px-3 text-[13px] font-bold text-brand"><IconDownload size={16} />Excel</button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{shown.length} barang · masuk <b className="text-brand">{fmtQty(total.masuk)}</b> · keluar <b className="text-warn">{fmtQty(total.keluar)}</b></p>
        <label className="flex flex-none items-center gap-2 text-[13px] font-semibold text-ink-2">
          <input type="checkbox" checked={onlyMoving} onChange={(e) => setOnlyMoving(e.target.checked)} className="h-4 w-4 accent-[#0E7C66]" />Hanya yang bergerak
        </label>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-[1fr_repeat(4,minmax(0,48px))] gap-1 border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted lg:grid-cols-[1fr_repeat(5,90px)]">
          <span>Barang</span><span className="text-right">Awal</span><span className="text-right">Masuk</span><span className="text-right">Keluar</span><span className="hidden text-right lg:block">Penyes.</span><span className="text-right">Akhir</span>
        </div>
        {shown.map((r) => (
          <div key={r.id} className="border-b border-[#EEF0F3] last:border-b-0">
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="grid w-full grid-cols-[1fr_repeat(4,minmax(0,48px))] items-center gap-1 px-4 py-3 text-left text-sm active:bg-canvas lg:grid-cols-[1fr_repeat(5,90px)]">
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 font-semibold leading-snug">{r.name}</span>
                <span className="truncate text-xs text-ink-muted">{[r.code, r.unit].filter(Boolean).join(" · ")}{r.sesuai ? <span className="lg:hidden"> · penyes. {r.sesuai > 0 ? "+" : ""}{fmtQty(r.sesuai)}</span> : null}</span>
              </span>
              <span className="text-right tabular-nums text-ink-2">{fmtQty(r.awal)}</span>
              <span className={cx("text-right tabular-nums", r.masuk ? "font-semibold text-brand" : "text-ink-muted")}>{r.masuk ? `+${fmtQty(r.masuk)}` : "0"}</span>
              <span className={cx("text-right tabular-nums", r.keluar ? "font-semibold text-warn" : "text-ink-muted")}>{r.keluar ? `−${fmtQty(r.keluar)}` : "0"}</span>
              <span className="hidden text-right tabular-nums text-ink-2 lg:block">{r.sesuai > 0 ? "+" : ""}{fmtQty(r.sesuai)}</span>
              <span className="text-right font-bold tabular-nums">{fmtQty(r.akhir)}</span>
            </button>
            {open === r.id ? (
              <div className="flex flex-col gap-2 bg-canvas px-4 py-3 text-sm">
                {Object.entries(r.detail).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-ink-2">{LABEL[k] ?? k}</span><span className={v >= 0 ? "font-semibold text-brand" : "font-semibold text-warn"}>{v >= 0 ? "+" : ""}{fmtQty(v)}</span></div>
                ))}
                <div className="mt-1 flex flex-col border-t border-line pt-2">
                  {r.moves.slice(0, 30).map((m, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs"><span className="text-ink-muted">{fmtDateTime(m.created_at)} · {LABEL[m.movement_type] ?? m.movement_type} · {warehouseNames[m.warehouse_id]}</span><span className="font-semibold">{Number(m.qty_delta) > 0 ? "+" : ""}{fmtQty(m.qty_delta)}</span></div>
                  ))}
                  {r.moves.length > 30 ? <span className="text-xs text-ink-muted">+{r.moves.length - 30} pergerakan lain</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {shown.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink-muted">Tidak ada barang masuk atau keluar di periode ini.</p> : null}
      </section>
      <p className="text-xs text-ink-muted">Masuk = barang masuk + retur dari pelanggan + transfer masuk. Keluar = barang keluar + retur ke pemasok + transfer keluar. Penyesuaian = selisih opname dan pembatalan. Ketuk barang untuk melihat rinciannya.</p>
    </div>
  );
}

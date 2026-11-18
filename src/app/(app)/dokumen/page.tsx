"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconDoc, IconPlus } from "@/components/icons";
import { Badge, cx, Empty, Sheet, Spinner } from "@/components/ui";
import { useActiveWarehouseIds, useApp } from "@/lib/app-context";
import { fmtDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { DOC_LABEL, STATUS_LABEL, type DocType, type DocumentRow } from "@/lib/types";
import { WarehousePicker } from "@/components/AppShell";

const TABS: { key: "all" | DocType; label: string }[] = [
  { key: "all", label: "Semua" }, { key: "in", label: "Masuk" }, { key: "out", label: "Keluar" },
  { key: "transfer", label: "Transfer" }, { key: "opname", label: "Opname" }, { key: "return_in", label: "Retur" },
];

const NEW_TYPES: { type: DocType; desc: string }[] = [
  { type: "in", desc: "Terima barang ke gudang" },
  { type: "out", desc: "Kirim atau jual barang" },
  { type: "transfer", desc: "Pindahkan stok antar gudang, tanpa omzet" },
  { type: "opname", desc: "Hitung fisik & cocokkan stok" },
  { type: "return_in", desc: "Barang kembali dari pembeli" },
  { type: "return_out", desc: "Barang dikembalikan ke pemasok" },
];

export default function DokumenPage() {
  const { tenant, warehouseNames } = useApp();
  const whIds = useActiveWarehouseIds();
  const [tab, setTab] = useState<"all" | DocType>("all");
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setDocs(null);
    let q = supabase().from("documents").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(200);
    if (tab === "return_in") q = q.in("doc_type", ["return_in", "return_out"]);
    else if (tab !== "all") q = q.eq("doc_type", tab);
    q.then(({ data }) => setDocs((data ?? []) as DocumentRow[]));
  }, [tenant, tab]);

  const visible = (docs ?? []).filter((d) => [d.warehouse_id, d.from_warehouse_id, d.to_warehouse_id].some((w) => w && whIds.includes(w)));

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line bg-white px-4 pt-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Dokumen</h1>
          <div className="flex items-center gap-2">
            <div className="w-48 lg:w-64"><WarehousePicker /></div>
            <button onClick={() => setNewOpen(true)} className="hidden h-11 items-center gap-2 rounded-xl2 bg-brand px-4 text-sm font-bold text-white lg:flex"><IconPlus size={18} />Dokumen baru</button>
          </div>
        </div>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cx("h-11 flex-none border-b-2 px-3 text-sm font-semibold", tab === t.key ? "border-brand text-brand" : "border-transparent text-ink-muted")}>{t.label}</button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl lg:px-6 lg:py-4">
        {!docs ? <Spinner /> : visible.length === 0 ? (
          <Empty icon={<IconDoc />} title="Belum ada dokumen">Setiap perubahan stok dicatat sebagai dokumen: barang masuk, keluar, transfer, atau opname.</Empty>
        ) : (
          <div className="bg-white lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
            {visible.map((d) => (
              <Link key={d.id} href={`/dokumen/${d.id}`} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4 py-3 active:bg-canvas lg:hover:bg-canvas">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{d.number} · {DOC_LABEL[d.doc_type]}{d.is_order ? " (pesanan)" : ""}</span>
                  <span className="truncate text-xs text-ink-muted">
                    {fmtDate(d.doc_date)} · {d.doc_type === "transfer"
                      ? `${warehouseNames[d.from_warehouse_id ?? ""] ?? "Gudang lain"} → ${warehouseNames[d.to_warehouse_id ?? ""] ?? "Gudang lain"}`
                      : warehouseNames[d.warehouse_id ?? ""]}{d.notes ? ` · ${d.notes}` : ""}
                  </span>
                </span>
                <Badge tone={d.status === "draft" ? "gray" : d.status === "void" ? "red" : d.status === "in_transit" ? "indigo" : "green"}>{STATUS_LABEL[d.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </main>

      <button onClick={() => setNewOpen(true)} aria-label="Dokumen baru" className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand text-white shadow-lg lg:hidden"><IconPlus size={24} /></button>

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Dokumen baru">
        <div className="flex flex-col">
          {NEW_TYPES.map((n) => (
            <Link key={n.type} href={n.type === "transfer" ? "/transfer/baru" : `/dokumen/baru?jenis=${n.type}`} className="flex items-center justify-between border-t border-[#EEF0F3] py-3.5 first:border-t-0">
              <span className="flex flex-col"><span className="text-[15px] font-semibold">{DOC_LABEL[n.type]}</span><span className="text-xs text-ink-muted">{n.desc}</span></span>
              <IconPlus size={18} className="text-brand" />
            </Link>
          ))}
        </div>
      </Sheet>
    </>
  );
}

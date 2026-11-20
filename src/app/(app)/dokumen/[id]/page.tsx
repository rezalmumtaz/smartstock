"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DocumentEditor from "@/components/DocumentEditor";
import { IconPin, IconPrinter } from "@/components/icons";
import PrintReceipt from "@/components/PrintReceipt";
import { Badge, Button, Card, PageHeader, Spinner, Stepper, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { fmtDate, fmtDateTime, fmtQty, fmtRp } from "@/lib/format";
import { errorMessage, supabase } from "@/lib/supabase";
import { nameFromEmail, receiptTitle, type ReceiptData } from "@/lib/receipt";
import { DOC_LABEL, STATUS_LABEL, type DocumentLine, type DocumentRow } from "@/lib/types";

type LineRow = DocumentLine & { items: { name: string; unit: string | null; code: string | null } | null };

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { isOwner, warehouses, warehouseNames, tenant, session } = useApp();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [contact, setContact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  /** lokasi[itemId][warehouseId] untuk gudang asal & tujuan dokumen */
  const [locs, setLocs] = useState<Record<string, Record<string, string>>>({});
  const [people, setPeople] = useState<{ created_email: string | null; posted_email: string | null; received_email: string | null } | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: d } = await sb.from("documents").select("*").eq("id", id).maybeSingle();
    if (!d) { setDoc(null); setLoading(false); return; }
    const docRow = d as DocumentRow;
    const [{ data: ls }, ct] = await Promise.all([
      sb.from("document_lines").select("*, items(name, unit, code)").eq("document_id", id).order("line_no"),
      docRow.contact_id ? sb.from("contacts").select("name").eq("id", docRow.contact_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const lineRows = (ls ?? []) as LineRow[];
    const pmap: Record<string, number> = {};
    if (isOwner && lineRows.length) {
      const { data: pr } = await sb.from("document_line_prices").select("line_id, unit_price").in("line_id", lineRows.map((l) => l.id));
      for (const p of (pr ?? []) as { line_id: string; unit_price: number }[]) pmap[p.line_id] = Number(p.unit_price);
    }
    const whs = [docRow.warehouse_id, docRow.from_warehouse_id, docRow.to_warehouse_id].filter((x): x is string => !!x);
    const lmap: Record<string, Record<string, string>> = {};
    if (lineRows.length && whs.length) {
      const { data: lc } = await sb.from("item_locations").select("item_id, warehouse_id, location").in("item_id", [...new Set(lineRows.map((l) => l.item_id))]).in("warehouse_id", whs);
      for (const r of (lc ?? []) as { item_id: string; warehouse_id: string; location: string }[]) (lmap[r.item_id] ??= {})[r.warehouse_id] = r.location;
    }
    setLocs(lmap);
    if (docRow.status !== "draft") {
      const { data: pp } = await sb.rpc("document_people", { p_document: id });
      setPeople(((pp ?? []) as NonNullable<typeof people>[])[0] ?? null);
    }
    setDoc(docRow); setLines(lineRows); setPrices(pmap);
    setContact((ct.data as { name: string } | null)?.name ?? null);
    setReceived(Object.fromEntries(lineRows.map((l) => [l.id, Number(l.qty)])));
    setLoading(false);
  }, [id, isOwner]);

  useEffect(() => { load(); }, [load]);
  // setelah posting dari form, langsung tawarkan cetak bukti
  useEffect(() => {
    if (!doc || doc.status === "draft") return;
    if (new URLSearchParams(window.location.search).get("cetak") === "1") {
      setPrintOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [doc]);

  const receipt = useMemo<ReceiptData | null>(() => {
    if (!doc) return null;
    const isTrf = doc.doc_type === "transfer";
    const recvd = isTrf && doc.status === "received";
    const inbound = doc.doc_type === "in" || doc.doc_type === "return_in" || recvd;
    const locWh = recvd ? doc.to_warehouse_id : doc.warehouse_id ?? doc.from_warehouse_id;
    const meta: [string, string][] = isTrf
      ? [["Dari", warehouseNames[doc.from_warehouse_id ?? ""] ?? "-"], ["Ke", warehouseNames[doc.to_warehouse_id ?? ""] ?? "-"]]
      : [["Gudang", warehouseNames[doc.warehouse_id ?? ""] ?? "-"]];
    if (contact) meta.push([doc.doc_type === "in" || doc.doc_type === "return_out" ? "Pemasok" : "Pelanggan", contact]);
    const petugas = nameFromEmail(recvd ? people?.received_email : people?.posted_email ?? people?.created_email);
    if (petugas) meta.push(["Petugas", petugas]);
    const when = recvd ? doc.received_at : doc.posted_at;
    const time = when ? new Date(when).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
    const now = new Date();
    return {
      company: { name: tenant?.name ?? "Smart Stock", address: tenant?.address, phone: tenant?.phone, logo: tenant?.logo_url },
      title: receiptTitle(doc.doc_type, doc.status),
      number: doc.number,
      date: `${fmtDate(recvd && doc.received_at ? doc.received_at : doc.doc_date)}${time ? ` ${time}` : ""}`,
      meta,
      lines: lines.map((l) => {
        const sent = Number(l.qty), got = Number(l.qty_received ?? l.qty);
        let note: string | null = null;
        if (recvd && got !== sent) note = `Dikirim ${fmtQty(sent)}, selisih ${fmtQty(sent - got)}`;
        if (doc.doc_type === "opname" && l.qty_system !== null) note = `Sistem ${fmtQty(l.qty_system)}, selisih ${sent - Number(l.qty_system) > 0 ? "+" : ""}${fmtQty(sent - Number(l.qty_system))}`;
        return { name: l.items?.name ?? "Barang", code: l.items?.code, unit: l.items?.unit, qty: recvd ? got : sent, location: locWh ? locs[l.item_id]?.[locWh] : null, note };
      }),
      notes: doc.notes,
      signs: ["Admin", "Gudang"],
      footer: `${inbound ? "Barang diterima dalam keadaan baik." : "Barang diambil/dikeluarkan sesuai daftar."}\nDicetak ${fmtDate(now.toISOString())} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}${session?.user.email ? ` oleh ${nameFromEmail(session.user.email)}` : ""}`,
      voided: doc.status === "void",
    };
  }, [doc, lines, locs, contact, people, tenant, warehouseNames, session]);

  if (loading) return <><PageHeader title="Dokumen" back="/dokumen" /><Spinner /></>;
  if (!doc) return <><PageHeader title="Dokumen" back="/dokumen" /><p className="p-6 text-center text-sm text-ink-muted">Dokumen tidak ditemukan atau Anda tidak punya akses.</p></>;

  const access = new Set(warehouses.map((w) => w.id));
  const sourceWh = doc.warehouse_id ?? doc.from_warehouse_id ?? "";
  const canEditDraft = doc.status === "draft" && access.has(sourceWh);
  if (canEditDraft) {
    return <DocumentEditor docType={doc.doc_type} existing={{ doc, lines, prices }} />;
  }

  const isTransfer = doc.doc_type === "transfer";
  const canReceive = isTransfer && doc.status === "in_transit" && !!doc.to_warehouse_id && access.has(doc.to_warehouse_id);
  const showPrice = isOwner && (doc.doc_type === "in" || doc.doc_type === "out");
  const total = lines.reduce((s, l) => s + Number(l.qty) * (prices[l.id] ?? 0), 0);

  async function receive() {
    setBusy(true);
    const payload = lines.map((l) => ({ line_id: l.id, qty_received: received[l.id] ?? Number(l.qty) }));
    const { error } = await supabase().rpc("receive_transfer", { p_document_id: doc!.id, p_received: payload });
    setBusy(false);
    if (error) toast(errorMessage(error), "err");
    else { toast("Transfer diterima, stok gudang tujuan bertambah"); load(); }
  }

  async function voidDoc() {
    if (!confirm("Batalkan dokumen ini? Semua perubahan stok dari dokumen ini akan dikembalikan.")) return;
    setBusy(true);
    const { error } = await supabase().rpc("void_document", { p_document_id: doc!.id });
    setBusy(false);
    if (error) toast(errorMessage(error), "err");
    else { toast("Dokumen dibatalkan"); load(); }
  }

  const tone = doc.status === "void" ? "red" : doc.status === "in_transit" ? "indigo" : doc.status === "draft" ? "gray" : "green";
  const sentTotal = lines.reduce((s, l) => s + Number(l.qty), 0);
  const recvTotal = lines.reduce((s, l) => s + (received[l.id] ?? 0), 0);

  return (
    <>
      <PageHeader title={`${DOC_LABEL[doc.doc_type]} ${doc.number}`} subtitle={fmtDate(doc.doc_date)} back="/dokumen" right={<Badge tone={tone}>{STATUS_LABEL[doc.status]}</Badge>} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 pb-40 lg:px-6 lg:pb-8">
        <Card className="flex flex-col gap-3">
          {isTransfer ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col"><span className="text-[11px] font-semibold text-ink-muted">DARI</span><span className="text-[15px] font-bold">{warehouseNames[doc.from_warehouse_id ?? ""] ?? "Gudang lain"}</span></div>
              <span className="text-indigo">→</span>
              <div className="flex flex-1 flex-col items-end"><span className="text-[11px] font-semibold text-ink-muted">KE</span><span className="text-[15px] font-bold">{warehouseNames[doc.to_warehouse_id ?? ""] ?? "Gudang lain"}</span></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col"><span className="text-[11px] font-semibold text-ink-muted">GUDANG</span><span className="font-semibold">{warehouseNames[doc.warehouse_id ?? ""]}</span></div>
              {contact ? <div className="flex flex-col"><span className="text-[11px] font-semibold text-ink-muted">{doc.doc_type === "in" || doc.doc_type === "return_out" ? "PEMASOK" : "PELANGGAN"}</span><span className="font-semibold">{contact}</span></div> : null}
            </div>
          )}
          {isTransfer ? (
            <ol className="flex items-center gap-2 text-xs font-semibold">
              <Step done label="Draft" /><span className="h-0.5 flex-1 bg-brand" />
              <Step done={doc.status !== "draft"} label="Dikirim" /><span className={doc.status === "received" ? "h-0.5 flex-1 bg-brand" : "h-0.5 flex-1 bg-line-strong"} />
              <Step done={doc.status === "received"} label="Diterima" />
            </ol>
          ) : null}
          <div className="flex flex-col gap-0.5 text-xs text-ink-muted">
            {doc.posted_at ? <span>{isTransfer ? "Dikirim" : "Diposting"} {fmtDateTime(doc.posted_at)}</span> : null}
            {doc.received_at ? <span>Diterima {fmtDateTime(doc.received_at)}</span> : null}
            {doc.notes ? <span>Keterangan: {doc.notes}</span> : null}
          </div>
          {isTransfer ? <p className="rounded-xl2 bg-canvas p-3 text-xs text-ink-3">Transfer hanya memindahkan stok, tanpa omzet.</p> : null}
        </Card>

        {receipt && doc.status !== "void" ? (
          <Button variant="secondary" onClick={() => setPrintOpen(true)}><IconPrinter size={18} />Cetak {receipt.title.toLowerCase()}</Button>
        ) : null}

        <h2 className="text-sm font-bold">{canReceive ? "Cek barang diterima" : `Barang (${lines.length})`}</h2>
        {lines.map((l) => {
          const recv = received[l.id] ?? Number(l.qty);
          const diff = Number(l.qty) - recv;
          return (
            <Card key={l.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{l.items?.name ?? "Barang"}</span>
                <span className="whitespace-nowrap text-sm font-bold">{fmtQty(l.qty)} {l.items?.unit ?? ""}</span>
              </div>
              {(() => {
                const src = locs[l.item_id]?.[sourceWh];
                const dst = isTransfer && doc.to_warehouse_id ? locs[l.item_id]?.[doc.to_warehouse_id] : undefined;
                if (!src && !dst) return null;
                return (
                  <span className="flex flex-col gap-0.5 text-xs font-semibold text-indigo">
                    {src ? <span className="flex items-center gap-1"><IconPin size={12} className="flex-none" />{isTransfer ? "Ambil di: " : ""}{src}</span> : null}
                    {dst ? <span className="flex items-center gap-1"><IconPin size={12} className="flex-none" />Simpan di tujuan: {dst}</span> : null}
                  </span>
                );
              })()}
              {doc.doc_type === "opname" && l.qty_system !== null ? (
                <span className="text-xs text-ink-muted">Stok sistem {fmtQty(l.qty_system)} · hasil hitung {fmtQty(l.qty)} · selisih {Number(l.qty) - Number(l.qty_system) > 0 ? "+" : ""}{fmtQty(Number(l.qty) - Number(l.qty_system))}</span>
              ) : null}
              {showPrice ? <span className="text-xs text-ink-muted">{fmtRp(prices[l.id] ?? 0)} × {fmtQty(l.qty)} = <b className="text-ink">{fmtRp((prices[l.id] ?? 0) * Number(l.qty))}</b></span> : null}
              {isTransfer && doc.status === "received" ? (
                <span className={Number(l.qty_received) < Number(l.qty) ? "text-xs font-semibold text-warn" : "text-xs font-semibold text-brand"}>
                  Diterima {fmtQty(l.qty_received)}{Number(l.qty_received) < Number(l.qty) ? ` · selisih ${fmtQty(Number(l.qty) - Number(l.qty_received))}` : " · sesuai"}
                </span>
              ) : null}
              {canReceive ? (
                <div className="flex items-center justify-between gap-2">
                  <span className={diff ? "text-xs font-semibold text-warn" : "text-xs font-semibold text-brand"}>{diff ? `Kurang ${fmtQty(diff)}, dicatat sebagai selisih` : "Sesuai"}</span>
                  <Stepper value={recv} max={Number(l.qty)} onChange={(v) => setReceived((r) => ({ ...r, [l.id]: v }))} />
                </div>
              ) : null}
            </Card>
          );
        })}
        {showPrice ? <div className="flex justify-between px-1 text-sm"><span className="text-ink-muted">Total nilai</span><span className="font-bold">{fmtRp(total)}</span></div> : null}

        {isOwner && doc.status !== "void" ? (
          <Button variant="danger" onClick={voidDoc} loading={busy && !canReceive} className="mt-2">Batalkan dokumen</Button>
        ) : null}
      </div>

      {receipt ? (
        <PrintReceipt open={printOpen} onClose={() => setPrintOpen(false)} data={receipt}
          extraSign={doc.doc_type === "in" || doc.doc_type === "return_in" ? "Pengirim" : doc.doc_type === "transfer" ? (doc.status === "received" ? "Pengirim" : "Kurir") : doc.doc_type === "opname" ? "Saksi" : "Penerima"} />
      ) : null}

      {canReceive ? (
        <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pt-3 lg:static lg:mx-auto lg:w-full lg:max-w-3xl lg:rounded-2xl lg:border lg:px-6 lg:py-4">
          <div className="mb-2.5 flex justify-between text-sm"><span className="text-ink-muted">Diterima / dikirim</span><span className="font-bold">{fmtQty(recvTotal)} / {fmtQty(sentTotal)} unit</span></div>
          <Button className="mb-3 w-full lg:mb-0" onClick={receive} loading={busy}>Konfirmasi terima</Button>
        </footer>
      ) : null}
    </>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={done ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white" : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand text-brand"}>{done ? "✓" : ""}</span>
      <span className={done ? "" : "text-brand"}>{label}</span>
    </li>
  );
}

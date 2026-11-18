"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { loadCatalog, type Catalog } from "@/lib/data";
import { fmtQty, fmtRp, todayISO } from "@/lib/format";
import { errorMessage, supabase } from "@/lib/supabase";
import { DOC_LABEL, type Contact, type DocType, type DocumentLine, type DocumentRow } from "@/lib/types";
import { IconBox, IconPlus, IconScan, IconSearch, IconTrash, IconPin } from "./icons";
import Scanner from "./Scanner";
import { Button, Card, Empty, Field, Input, PageHeader, Select, Sheet, Spinner, Stepper, Textarea, useToast } from "./ui";

interface Line { item_id: string; qty: number; price: number | null }

const CONTACT_TYPE: Partial<Record<DocType, "supplier" | "customer">> = { in: "supplier", return_out: "supplier", out: "customer", return_in: "customer" };

export default function DocumentEditor({ docType, existing, initialItem }: { docType: DocType; initialItem?: string | null; existing?: { doc: DocumentRow; lines: DocumentLine[]; prices: Record<string, number> } }) {
  const router = useRouter();
  const toast = useToast();
  const { tenant, isOwner, canEditMaster, warehouses, warehouseNames, warehouseFilter } = useApp();
  const isTransfer = docType === "transfer";
  const isOpname = docType === "opname";
  const withPrice = isOwner && (docType === "in" || docType === "out");
  const contactType = CONTACT_TYPE[docType];

  const defaultWh = existing?.doc.warehouse_id ?? existing?.doc.from_warehouse_id ?? (warehouseFilter !== "all" ? warehouseFilter : warehouses[0]?.id ?? "");
  const [wh, setWh] = useState(defaultWh);
  const [toWh, setToWh] = useState(existing?.doc.to_warehouse_id ?? "");
  const [date, setDate] = useState(existing?.doc.doc_date ?? todayISO());
  const [contactId, setContactId] = useState(existing?.doc.contact_id ?? "");
  const [newContact, setNewContact] = useState("");
  const [notes, setNotes] = useState(existing?.doc.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => existing?.lines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), price: existing.prices[l.id] ?? null })) ?? (initialItem ? [{ item_id: initialItem, qty: docType === "opname" ? 0 : 1, price: null }] : []));
  const [cat, setCat] = useState<Catalog | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState<"draft" | "post" | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    loadCatalog(tenant.id, isOwner).then(setCat);
    if (contactType) {
      supabase().from("contacts").select("id, contact_type, name, phone").eq("tenant_id", tenant.id).eq("contact_type", contactType).eq("is_hidden", false).order("name")
        .then(({ data }) => setContacts((data ?? []) as Contact[]));
    }
  }, [tenant, isOwner, contactType]);

  const itemMap = useMemo(() => Object.fromEntries((cat?.items ?? []).map((i) => [i.id, i])), [cat]);
  const available = (itemId: string) => cat?.stock[itemId]?.[wh] ?? 0;
  const destOptions = Object.entries(warehouseNames).filter(([id]) => id !== wh);

  function defaultPrice(itemId: string): number | null {
    if (!withPrice || !cat) return null;
    const p = cat.prices[itemId];
    if (!p) return null;
    return docType === "in" ? p.purchase_price : p.sell_price;
  }

  function addItem(itemId: string, inc = 1) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.item_id === itemId);
      if (i >= 0) { const c = [...ls]; c[i] = { ...c[i], qty: c[i].qty + inc }; return c; }
      const startQty = isOpname ? (cat?.stock[itemId]?.[wh] ?? 0) : inc;
      return [...ls, { item_id: itemId, qty: startQty, price: defaultPrice(itemId) }];
    });
  }

  function onScan(code: string) {
    const it = cat?.items.find((x) => x.barcode === code || x.code === code);
    if (!it) { toast(`Barcode ${code} belum terdaftar`, "err"); setLastScan(`Tidak dikenal: ${code}`); return; }
    addItem(it.id, 1);
    setLastScan(`${it.name} +1`);
  }

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = lines.reduce((s, l) => s + l.qty * (l.price ?? 0), 0);

  async function persist(post: boolean) {
    if (!tenant) return;
    if (!wh) { toast("Pilih gudang", "err"); return; }
    if (isTransfer && !toWh) { toast("Pilih gudang tujuan", "err"); return; }
    if (lines.length === 0) { toast("Tambahkan minimal 1 barang", "err"); return; }
    if (post && !isOpname && lines.some((l) => l.qty <= 0)) { toast("Qty harus lebih dari 0", "err"); return; }
    if (post && (docType === "out" || docType === "return_out" || isTransfer)) {
      const short = lines.find((l) => l.qty > available(l.item_id));
      if (short) { toast(`Stok ${itemMap[short.item_id]?.name} tidak cukup (tersedia ${fmtQty(available(short.item_id))})`, "err"); return; }
    }
    setBusy(post ? "post" : "draft");
    const sb = supabase();
    try {
      let cId: string | null = contactId && contactId !== "__new" ? contactId : null;
      if (contactId === "__new" && newContact.trim() && contactType) {
        const { data, error } = await sb.from("contacts").insert({ tenant_id: tenant.id, contact_type: contactType, name: newContact.trim() }).select("id").single();
        if (error) throw error;
        cId = data.id;
      }
      const header = {
        tenant_id: tenant.id, doc_type: docType, doc_date: date, notes: notes.trim() || null, contact_id: cId,
        warehouse_id: isTransfer ? null : wh, from_warehouse_id: isTransfer ? wh : null, to_warehouse_id: isTransfer ? toWh : null,
      };
      let docId = existing?.doc.id;
      if (docId) {
        const { error } = await sb.from("documents").update(header).eq("id", docId);
        if (error) throw error;
        const { error: e2 } = await sb.from("document_lines").delete().eq("document_id", docId);
        if (e2) throw e2;
      } else {
        const { data, error } = await sb.from("documents").insert(header).select("id").single();
        if (error) throw error;
        docId = data.id as string;
      }
      const { data: ins, error: e3 } = await sb.from("document_lines")
        .insert(lines.map((l, i) => ({ tenant_id: tenant.id, document_id: docId, item_id: l.item_id, qty: l.qty, line_no: i + 1 })))
        .select("id, line_no");
      if (e3) throw e3;
      if (withPrice) {
        const priced = (ins ?? []).map((row: { id: string; line_no: number }) => ({ line_id: row.id, tenant_id: tenant.id, unit_price: lines[row.line_no - 1]?.price ?? 0 }));
        if (priced.length) { const { error } = await sb.from("document_line_prices").insert(priced); if (error) throw error; }
      }
      if (post) {
        const { error } = await sb.rpc(isTransfer ? "send_transfer" : "post_document", { p_document_id: docId });
        if (error) throw error;
      }
      toast(post ? (isTransfer ? "Transfer dikirim" : "Dokumen diposting, stok diperbarui") : "Draft disimpan");
      router.replace(`/dokumen/${docId}${post ? "?cetak=1" : ""}`);
    } catch (err) {
      toast(errorMessage(err), "err");
      setBusy(null);
    }
  }

  if (!cat) return <><PageHeader title={DOC_LABEL[docType]} back /><Spinner /></>;

  const postLabel = isTransfer ? "Kirim transfer" : isOpname ? "Posting hasil hitung" : docType === "in" || docType === "return_in" ? "Posting · stok bertambah" : "Posting · stok berkurang";

  return (
    <>
      <PageHeader title={existing ? `${DOC_LABEL[docType]} ${existing.doc.number}` : `${DOC_LABEL[docType]} baru`} subtitle="Draft" back
        right={<button onClick={() => setScan(true)} aria-label="Scan barcode" className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-brand-soft text-brand"><IconScan /></button>} />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 pb-44 lg:px-6 lg:pb-8">
        <Card className="grid grid-cols-2 gap-3">
          <Field label={isTransfer ? "Dari gudang" : "Gudang"} htmlFor="wh">
            <Select id="wh" value={wh} onChange={(e) => setWh(e.target.value)}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          {isTransfer ? (
            <Field label="Ke gudang" htmlFor="to">
              <Select id="to" value={toWh} onChange={(e) => setToWh(e.target.value)}>
                <option value="">Pilih tujuan</option>
                {destOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Tanggal" htmlFor="dt"><Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          )}
          {isTransfer ? <Field label="Tanggal" htmlFor="dt2"><Input id="dt2" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field> : null}
          {contactType ? (
            <Field label={contactType === "supplier" ? "Pemasok" : "Pelanggan"} htmlFor="ct">
              <Select id="ct" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">Tanpa {contactType === "supplier" ? "pemasok" : "pelanggan"}</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {canEditMaster ? <option value="__new">+ Tambah baru…</option> : null}
              </Select>
            </Field>
          ) : null}
          {contactId === "__new" ? <Field label="Nama baru" htmlFor="nc"><Input id="nc" value={newContact} onChange={(e) => setNewContact(e.target.value)} /></Field> : null}
          <div className="col-span-2"><Field label="Keterangan" htmlFor="nt"><Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[56px]" placeholder={isTransfer ? "Contoh: kirim via mobil box" : "Opsional"} /></Field></div>
          {isTransfer ? <p className="col-span-2 rounded-xl2 bg-canvas p-3 text-xs leading-relaxed text-ink-3">Transfer hanya memindahkan stok antar gudang, tanpa omzet. Stok gudang asal berkurang saat dikirim, dan bertambah di gudang tujuan setelah diterima.</p> : null}
          {isOpname ? <p className="col-span-2 rounded-xl2 bg-canvas p-3 text-xs leading-relaxed text-ink-3">Isi jumlah hasil hitung fisik. Saat diposting, selisih dengan stok sistem disesuaikan otomatis.</p> : null}
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Barang ({lines.length})</h2>
          <button onClick={() => setPicker(true)} className="flex h-10 items-center gap-1 rounded-xl border border-line-strong bg-white px-3 text-[13px] font-semibold text-brand"><IconPlus size={16} />Tambah barang</button>
        </div>

        {lines.length === 0 ? (
          <Card><Empty icon={<IconBox />} title="Belum ada barang">Ketuk “Tambah barang” atau scan barcode.</Empty></Card>
        ) : lines.map((l, idx) => {
          const it = itemMap[l.item_id];
          const avail = available(l.item_id);
          return (
            <Card key={l.item_id} className="flex flex-col gap-3 p-3">
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{it?.name ?? "Barang"}</span>
                  <span className="text-xs text-ink-muted">{isOpname ? `Stok sistem ${fmtQty(avail)} ${it?.unit ?? ""}` : `Stok ${warehouseNames[wh] ?? ""}: ${fmtQty(avail)} ${it?.unit ?? ""}`}</span>
                  {cat.locations[l.item_id]?.[wh] ? <span className="flex items-center gap-1 text-xs font-semibold text-indigo"><IconPin size={12} className="flex-none" />{cat.locations[l.item_id][wh]}</span> : null}
                </div>
                <button onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))} aria-label="Hapus baris" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas"><IconTrash size={18} /></button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stepper value={l.qty} onChange={(v) => setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, qty: v } : x)))} />
                {isOpname && l.qty !== avail ? <span className={l.qty > avail ? "text-xs font-semibold text-brand" : "text-xs font-semibold text-warn"}>Selisih {l.qty > avail ? "+" : ""}{fmtQty(l.qty - avail)}</span> : null}
                {withPrice ? (
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    {docType === "in" ? "Harga beli" : "Harga jual"}
                    <input inputMode="decimal" value={l.price ?? ""} onChange={(e) => { const n = Number(e.target.value.replace(/\./g, "").replace(",", ".")); setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, price: e.target.value === "" ? null : Number.isFinite(n) ? n : x.price } : x))); }}
                      className="h-10 w-28 rounded-xl2 border border-line-strong px-2 text-right text-sm font-semibold text-ink outline-none focus:border-brand" />
                  </label>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pt-3 lg:static lg:mx-auto lg:w-full lg:max-w-3xl lg:rounded-2xl lg:border lg:px-6 lg:py-4">
        <div className="mb-2.5 flex justify-between text-sm">
          <span className="text-ink-muted">Total {isOpname ? "hasil hitung" : "qty"}</span>
          <span className="font-bold">{fmtQty(totalQty)} unit{withPrice ? ` · ${fmtRp(totalAmount)}` : ""}</span>
        </div>
        <div className="flex gap-2.5 pb-3 lg:pb-0">
          <Button variant="secondary" onClick={() => persist(false)} loading={busy === "draft"} disabled={!!busy}>Simpan draft</Button>
          <Button className="flex-1" onClick={() => persist(true)} loading={busy === "post"} disabled={!!busy}>{postLabel}</Button>
        </div>
      </footer>

      <ItemPicker open={picker} onClose={() => setPicker(false)} cat={cat} wh={wh} onPick={(id) => { addItem(id, isOpname ? 0 : 1); setPicker(false); }} />

      {scan ? (
        <Scanner continuous title={`Scan ke ${DOC_LABEL[docType]}`} onClose={() => setScan(false)} onDetected={onScan}
          footer={<div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-3">{lastScan ?? "Mode batch: setiap scan menambah qty +1"}</span>
            <Button onClick={() => setScan(false)}>Selesai · {lines.length} barang</Button>
          </div>} />
      ) : null}
    </>
  );
}

function ItemPicker({ open, onClose, cat, wh, onPick }: { open: boolean; onClose: () => void; cat: Catalog; wh: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = cat.items.filter((it) => !term || [it.name, it.code, it.barcode, cat.locations[it.id]?.[wh]].some((v) => v?.toLowerCase().includes(term))).slice(0, 80);
  return (
    <Sheet open={open} onClose={onClose} title="Pilih barang">
      <label className="mb-3 flex h-12 items-center gap-2 rounded-xl2 border border-line bg-canvas px-3">
        <IconSearch size={18} className="text-ink-muted" />
        <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, barcode" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
      </label>
      {list.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">Barang tidak ditemukan. Tambahkan dulu di menu Barang.</p> : null}
      <div className="flex flex-col">
        {list.map((it) => (
          <button key={it.id} onClick={() => onPick(it.id)} className="flex items-center justify-between gap-3 border-t border-[#EEF0F3] py-3 text-left first:border-t-0">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{it.name}</span>
              <span className="truncate text-xs text-ink-muted">{[it.code, it.barcode].filter(Boolean).join(" · ")}</span>
              {cat.locations[it.id]?.[wh] ? <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-indigo"><IconPin size={12} className="flex-none" /><span className="truncate">{cat.locations[it.id][wh]}</span></span> : null}
            </span>
            <span className="text-sm font-bold">{fmtQty(cat.stock[it.id]?.[wh] ?? 0)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

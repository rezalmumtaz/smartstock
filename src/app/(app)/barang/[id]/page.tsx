"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IconLock, IconPin, IconScan } from "@/components/icons";
import LocationInput from "@/components/LocationInput";
import PhotoPicker, { syncPhotos, type Photo } from "@/components/PhotoPicker";
import Scanner from "@/components/Scanner";
import { Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { fmtDateTime, fmtQty, parseNum } from "@/lib/format";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Item, ItemGroup } from "@/lib/types";

interface Movement { id: string; warehouse_id: string; movement_type: string; qty_delta: number; created_at: string; document_id: string | null }

const MOVE_LABEL: Record<string, string> = {
  in: "Masuk", out: "Keluar", return_in: "Retur masuk", return_out: "Retur keluar", opname_adjust: "Penyesuaian opname",
  transfer_out: "Transfer keluar", transfer_in: "Transfer masuk", void_reversal: "Pembatalan",
};

export default function ItemPage() {
  return <Suspense fallback={<Spinner />}><ItemForm /></Suspense>;
}

function ItemForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "baru";
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { tenant, isOwner, canEditMaster, warehouses, warehouseNames } = useApp();
  /** supervisor: data barang hanya dibaca, yang bisa diubah hanya lokasi simpan */
  const readOnly = !canEditMaster && !isNew;
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [moves, setMoves] = useState<Movement[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [origPhotos, setOrigPhotos] = useState<string[]>([]);
  const [opening, setOpening] = useState<Record<string, string>>({});
  const [locs, setLocs] = useState<Record<string, string>>({});
  const [origLocs, setOrigLocs] = useState<Record<string, string>>({});
  const [editLoc, setEditLoc] = useState<Record<string, boolean>>({});
  const [knownLocs, setKnownLocs] = useState<Record<string, string[]>>({});
  const [f, setF] = useState({
    name: "", code: "", barcode: params.get("barcode") ?? "", unit: "pcs", group_id: "", newGroup: "", min_qty: "", description: "",
    purchase_price: "", sell_price: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!tenant) return;
    const sb = supabase();
    sb.from("item_groups").select("id, name").eq("tenant_id", tenant.id).order("name").then(({ data }) => setGroups((data ?? []) as ItemGroup[]));
    sb.from("item_locations").select("warehouse_id, location").eq("tenant_id", tenant.id).limit(5000).then(({ data }) => {
      const m: Record<string, Set<string>> = {};
      for (const r of (data ?? []) as { warehouse_id: string; location: string }[]) (m[r.warehouse_id] ??= new Set()).add(r.location);
      setKnownLocs(Object.fromEntries(Object.entries(m).map(([w, s]) => [w, [...s].sort((a, b) => a.localeCompare(b, "id"))])));
    });
    if (isNew) return;
    (async () => {
      const [{ data: it }, { data: pr }, { data: st }, { data: mv }, { data: lc }] = await Promise.all([
        sb.from("items").select("*").eq("id", id).maybeSingle(),
        isOwner ? sb.from("item_prices").select("*").eq("item_id", id).maybeSingle() : Promise.resolve({ data: null }),
        sb.from("stock_levels").select("warehouse_id, qty").eq("item_id", id),
        sb.from("stock_movements").select("id, warehouse_id, movement_type, qty_delta, created_at, document_id").eq("item_id", id).order("created_at", { ascending: false }).limit(30),
        sb.from("item_locations").select("warehouse_id, location").eq("item_id", id),
      ]);
      if (!it) { toast("Barang tidak ditemukan", "err"); router.replace("/barang"); return; }
      const item = it as Item;
      const price = pr as { purchase_price: number; sell_price: number } | null;
      setF({
        name: item.name, code: item.code ?? "", barcode: item.barcode ?? "", unit: item.unit ?? "", group_id: item.group_id ?? "", newGroup: "",
        min_qty: item.min_qty !== null ? String(Number(item.min_qty)) : "", description: item.description ?? "",
        purchase_price: price ? String(Number(price.purchase_price)) : "", sell_price: price ? String(Number(price.sell_price)) : "",
      });
      setOrigPhotos(item.image_urls ?? []);
      setPhotos((item.image_urls ?? []).map((url) => ({ kind: "url" as const, url })));
      setStock(Object.fromEntries(((st ?? []) as { warehouse_id: string; qty: number }[]).map((s) => [s.warehouse_id, Number(s.qty)])));
      setMoves((mv ?? []) as Movement[]);
      const lm = Object.fromEntries(((lc ?? []) as { warehouse_id: string; location: string }[]).map((l) => [l.warehouse_id, l.location]));
      setLocs(lm); setOrigLocs(lm);
      setLoading(false);
    })();
  }, [tenant, id, isNew, isOwner, router, toast]);

  function genBarcode() {
    // EAN-13 internal (awalan 20–29 untuk penggunaan internal toko)
    const base = "2" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");
    const sum = base.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
    set("barcode", base + ((10 - (sum % 10)) % 10));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    if (readOnly) {
      setBusy(true);
      let ok = true;
      for (const w of warehouses.filter((w) => (locs[w.id] ?? "").trim() !== (origLocs[w.id] ?? "").trim())) {
        const { error } = await supabase().rpc("set_item_locations", { p_warehouse: w.id, p_rows: [{ item_id: id, location: (locs[w.id] ?? "").trim() }] });
        if (error) { ok = false; toast(`Lokasi ${w.name} gagal disimpan: ${errorMessage(error)}`, "err"); }
      }
      setBusy(false);
      if (ok) { toast("Lokasi disimpan"); setOrigLocs({ ...locs }); setEditLoc({}); }
      return;
    }
    const min = f.min_qty.trim() ? parseNum(f.min_qty) : null;
    if (f.min_qty.trim() && (min === null || min < 0)) { toast("Stok minimum tidak valid", "err"); return; }
    const entries = Object.entries(opening).filter(([, v]) => v.trim()).map(([warehouse_id, v]) => ({ warehouse_id, qty: parseNum(v) }));
    if (entries.some((e) => e.qty === null || e.qty < 0)) { toast("Stok awal tidak valid", "err"); return; }
    setBusy(true);
    const sb = supabase();
    try {
      let groupId: string | null = f.group_id || null;
      if (f.group_id === "__new" && f.newGroup.trim()) {
        const { data, error } = await sb.from("item_groups").insert({ tenant_id: tenant.id, name: f.newGroup.trim() }).select("id").single();
        if (error) throw error;
        groupId = data.id;
      } else if (f.group_id === "__new") groupId = null;
      const payload = {
        tenant_id: tenant.id, name: f.name.trim(), code: f.code.trim() || null, barcode: f.barcode.trim() || null,
        unit: f.unit.trim() || null, group_id: groupId, min_qty: min, description: f.description.trim() || null,
      };
      let itemId = id;
      if (isNew) {
        const { data, error } = await sb.from("items").insert(payload).select("id").single();
        if (error) throw error;
        itemId = data.id;
      } else {
        const { error } = await sb.from("items").update(payload).eq("id", id);
        if (error) throw error;
      }
      if (isOwner && (f.purchase_price.trim() || f.sell_price.trim())) {
        const pb = parseNum(f.purchase_price) ?? 0, ps = parseNum(f.sell_price) ?? 0;
        const { error } = await sb.from("item_prices").upsert({ item_id: itemId, tenant_id: tenant.id, purchase_price: pb, sell_price: ps });
        if (error) throw error;
      }
      // foto: setelah barang punya id
      const changed = photos.some((p) => p.kind === "file") || photos.length !== origPhotos.length;
      if (changed) {
        try {
          const urls = await syncPhotos(tenant.id, itemId, photos, origPhotos);
          const { error } = await sb.from("items").update({ image_urls: urls }).eq("id", itemId);
          if (error) throw error;
        } catch (err) {
          toast(`Barang tersimpan, tapi foto gagal diunggah: ${errorMessage(err)}`, "err");
        }
      }
      // lokasi simpan per gudang
      const changedLocs = warehouses.filter((w) => (locs[w.id] ?? "").trim() !== (origLocs[w.id] ?? "").trim());
      for (const w of changedLocs) {
        const { error } = await sb.rpc("set_item_locations", { p_warehouse: w.id, p_rows: [{ item_id: itemId, location: (locs[w.id] ?? "").trim() }] });
        if (error) toast(`Barang tersimpan, tapi lokasi ${w.name} gagal: ${errorMessage(error)}`, "err");
      }
      // stok awal: dicatat sebagai dokumen Barang masuk yang langsung diposting
      if (isNew && entries.some((e) => (e.qty ?? 0) > 0)) {
        const { data, error } = await sb.rpc("item_opening_stock", { p_item: itemId, p_entries: entries });
        if (error) { toast(`Barang tersimpan, tapi stok awal gagal: ${errorMessage(error)}`, "err"); router.push(`/barang/${itemId}`); return; }
        const nums = ((data as { numbers?: string[] })?.numbers ?? []).join(", ");
        toast(`Barang ditambahkan${nums ? ` · stok awal ${nums}` : ""}`);
        router.push("/barang");
        return;
      }
      toast(isNew ? "Barang ditambahkan" : "Perubahan disimpan");
      router.push("/barang");
    } catch (err) {
      toast(errorMessage(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!confirm("Arsipkan barang ini? Barang tidak tampil lagi di daftar, tapi riwayatnya tetap tersimpan.")) return;
    const { error } = await supabase().from("items").update({ is_active: false }).eq("id", id);
    if (error) toast(errorMessage(error), "err"); else { toast("Barang diarsipkan"); router.push("/barang"); }
  }

  if (loading) return <><PageHeader title="Barang" back="/barang" /><Spinner /></>;

  return (
    <>
      <PageHeader title={isNew ? "Barang baru" : "Ubah barang"} back="/barang" />
      <form onSubmit={save} className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        {!isNew ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Stok &amp; lokasi simpan</h2>
              <span className="text-xs text-ink-muted">stok diubah lewat dokumen</span>
            </div>
            {warehouses.map((w, wi) => (
              <div key={w.id} className={wi ? "flex flex-col gap-2 border-t border-[#EEF0F3] pt-3" : "flex flex-col gap-2"}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold">{w.name}</span>
                  <span className="whitespace-nowrap text-base font-bold">{fmtQty(stock[w.id] ?? 0)} <span className="text-xs font-semibold text-ink-muted">{f.unit}</span></span>
                </div>
                {origLocs[w.id] && !editLoc[w.id] ? (
                  <div className="flex items-start gap-2 rounded-xl2 bg-indigo-soft px-3 py-2.5 text-indigo">
                    <IconPin size={18} className="mt-0.5 flex-none" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Lokasi simpan</span>
                      <span className="break-words text-[15px] font-bold leading-snug">{origLocs[w.id]}</span>
                    </span>
                    <button type="button" onClick={() => setEditLoc((e) => ({ ...e, [w.id]: true }))} className="flex-none text-xs font-bold underline underline-offset-2">Ubah</button>
                  </div>
                ) : (
                  <LocationInput id={`lc-${w.id}`} label={`Lokasi simpan di ${w.name}`} value={locs[w.id] ?? ""} onChange={(v) => setLocs((l) => ({ ...l, [w.id]: v }))} suggestions={knownLocs[w.id] ?? []} />
                )}
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Link href={`/dokumen/baru?jenis=in&item=${id}`} className="flex h-10 items-center justify-center rounded-xl2 bg-brand-soft text-[13px] font-bold text-brand">+ Masuk</Link>
              <Link href={`/dokumen/baru?jenis=out&item=${id}`} className="flex h-10 items-center justify-center rounded-xl2 bg-warn-soft text-[13px] font-bold text-warn">− Keluar</Link>
              <Link href={`/dokumen/baru?jenis=opname&item=${id}`} className="flex h-10 items-center justify-center rounded-xl2 bg-[#F2F4F7] text-[13px] font-bold text-ink-2">Opname</Link>
            </div>
          </Card>
        ) : null}

        <fieldset disabled={readOnly} className="contents">
        <Card className="flex flex-col gap-4">
          {readOnly ? <p className="rounded-xl2 bg-canvas px-3 py-2 text-xs text-ink-muted">Data barang hanya bisa diubah owner atau admin gudang. Anda bisa mengisi stok lewat tombol Masuk/Keluar/Opname dan mengubah lokasi simpan.</p> : null}
          <Field label="Nama barang" htmlFor="nm"><Input id="nm" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Gelas kaca 300 ml" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode" htmlFor="cd"><Input id="cd" value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="SKU" /></Field>
            <Field label="Satuan" htmlFor="un"><Input id="un" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, kg, dus" /></Field>
          </div>
          <Field label="Barcode" htmlFor="bc">
            <div className="flex gap-2">
              <Input id="bc" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} className="flex-1" placeholder="Scan, ketik, atau buat" />
              <button type="button" onClick={() => setScan(true)} aria-label="Scan barcode" className="flex h-12 w-12 flex-none items-center justify-center rounded-xl2 border border-line-strong text-brand"><IconScan /></button>
              <button type="button" onClick={genBarcode} className="h-12 flex-none rounded-xl2 border border-line-strong px-3 text-sm font-bold text-brand">Buat</button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[13px] font-semibold">
              {!readOnly && f.code.trim() && f.barcode.trim() !== f.code.trim() ? <button type="button" onClick={() => set("barcode", f.code.trim())} className="text-brand">Pakai kode barang sebagai barcode</button> : null}
              {!isNew && !readOnly ? <Link href={`/barang/label?ids=${id}`} className="text-brand">Cetak label barcode</Link> : null}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grup" htmlFor="gr">
              <Select id="gr" value={f.group_id} onChange={(e) => set("group_id", e.target.value)}>
                <option value="">Tanpa grup</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                <option value="__new">+ Grup baru…</option>
              </Select>
            </Field>
            <Field label="Stok minimum" htmlFor="mn" hint="Peringatan bila stok di bawah angka ini"><Input id="mn" inputMode="decimal" value={f.min_qty} onChange={(e) => set("min_qty", e.target.value)} placeholder="0" /></Field>
          </div>
          {f.group_id === "__new" ? <Field label="Nama grup baru" htmlFor="ng"><Input id="ng" value={f.newGroup} onChange={(e) => set("newGroup", e.target.value)} /></Field> : null}
          <Field label="Deskripsi" htmlFor="ds"><Textarea id="ds" value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        </Card>

        </fieldset>

        {readOnly ? (photos.length ? (
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">Foto barang</h2>
            <div className="flex gap-2 overflow-x-auto">{photos.map((p, i) => <img key={i} src={p.kind === "url" ? p.url : p.preview} alt="" className="h-24 w-24 flex-none rounded-xl2 bg-white object-contain ring-1 ring-line" />)}</div>
          </Card>
        ) : null) : (
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">Foto barang</h2>
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </Card>
        )}

        {isNew && warehouses.length ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Stok awal &amp; lokasi simpan</h2>
              <span className="text-xs text-ink-muted">opsional</span>
            </div>
            <div className="flex flex-col gap-4">
              {warehouses.map((w) => (
                <div key={w.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label htmlFor={`op-${w.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</label>
                    <div className="flex w-40 items-center gap-2">
                      <Input id={`op-${w.id}`} inputMode="decimal" value={opening[w.id] ?? ""} onChange={(e) => setOpening((o) => ({ ...o, [w.id]: e.target.value }))} placeholder="0" className="text-right" />
                      <span className="w-9 flex-none text-xs text-ink-muted">{f.unit || "pcs"}</span>
                    </div>
                  </div>
                  <LocationInput id={`lc-${w.id}`} label={`Lokasi simpan di ${w.name}`} value={locs[w.id] ?? ""} onChange={(v) => setLocs((l) => ({ ...l, [w.id]: v }))} suggestions={knownLocs[w.id] ?? []} />
                </div>
              ))}
            </div>
            <span className="text-xs leading-relaxed text-ink-muted">Stok awal: jumlah barang yang sudah ada di gudang sekarang, dicatat otomatis sebagai dokumen Barang masuk “Stok awal”. Lokasi simpan: tempat barang ini diletakkan, supaya siapa pun bisa menemukannya.</span>
          </Card>
        ) : null}

        {isOwner ? (
          <Card className="flex flex-col gap-4 bg-[#F9FAFB]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Harga</h2>
              <span className="flex items-center gap-1 rounded-lg bg-[#EAECF0] px-2 py-1 text-[11px] font-semibold text-ink-3"><IconLock size={12} />Hanya owner</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga beli (Rp)" htmlFor="pb"><Input id="pb" inputMode="decimal" value={f.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} placeholder="0" /></Field>
              <Field label="Harga jual (Rp)" htmlFor="ps"><Input id="ps" inputMode="decimal" value={f.sell_price} onChange={(e) => set("sell_price", e.target.value)} placeholder="0" /></Field>
            </div>
          </Card>
        ) : null}

        {!isNew && moves.length ? (
          <Card className="flex flex-col gap-1">
            <h2 className="pb-1 text-sm font-bold">Riwayat terbaru</h2>
            {moves.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-t border-[#EEF0F3] py-2 text-sm">
                <span className="flex flex-col">
                  <span className="font-semibold">{MOVE_LABEL[m.movement_type] ?? m.movement_type}</span>
                  <span className="text-xs text-ink-muted">{warehouseNames[m.warehouse_id]} · {fmtDateTime(m.created_at)}</span>
                </span>
                <span className={Number(m.qty_delta) >= 0 ? "font-bold text-brand" : "font-bold text-warn"}>{Number(m.qty_delta) >= 0 ? "+" : ""}{fmtQty(m.qty_delta)}</span>
              </div>
            ))}
          </Card>
        ) : null}

        <div className="flex flex-col gap-2 pb-4 lg:flex-row-reverse">
          <Button type="submit" loading={busy} className="lg:min-w-48" disabled={readOnly && warehouses.every((w) => (locs[w.id] ?? "").trim() === (origLocs[w.id] ?? "").trim())}>{readOnly ? "Simpan lokasi" : "Simpan barang"}</Button>
          {!isNew && isOwner ? <Button type="button" variant="danger" onClick={archive}>Arsipkan</Button> : null}
        </div>
      </form>

      {scan ? <Scanner title="Scan barcode barang" onClose={() => setScan(false)} onDetected={(c) => { set("barcode", c); setScan(false); }} /> : null}
    </>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { IconBox, IconCheck, IconChevron, IconPlus, IconSearch } from "@/components/icons";
import { Button, cx, Field, Input, PageHeader, Select, Sheet, Spinner, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { fetchAll } from "@/lib/data";
import { errorMessage, supabase } from "@/lib/supabase";
import type { ItemGroup } from "@/lib/types";

type Row = { id: string; name: string; code: string | null; group_id: string | null; image_urls: string[] | null };
const NONE = "__none";

export default function GrupPage() {
  return <Suspense fallback={<Spinner />}><GrupManager /></Suspense>;
}

function GrupManager() {
  const { tenant, isOwner } = useApp();
  const router = useRouter();
  const open = useSearchParams().get("g"); // grup yang sedang dibuka (di URL supaya tombol kembali HP berfungsi)
  const toast = useToast();
  const [groups, setGroups] = useState<ItemGroup[] | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id?: string; name: string } | null>(null);
  const [del, setDel] = useState<ItemGroup | null>(null);
  const [moveTo, setMoveTo] = useState(NONE);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!tenant) return;
    const sb = supabase();
    const [g, it] = await Promise.all([
      fetchAll<ItemGroup>((a, b) => sb.from("item_groups").select("id, name").eq("tenant_id", tenant.id).order("name").range(a, b)),
      fetchAll<Row>((a, b) => sb.from("items").select("id, name, code, group_id, image_urls").eq("tenant_id", tenant.id).eq("is_active", true).order("name").range(a, b)),
    ]);
    setGroups(g); setItems(it);
  }
  useEffect(() => { load().catch((e) => toast(errorMessage(e), "err")); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tenant]);

  const count = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) { const k = it.group_id ?? NONE; c[k] = (c[k] ?? 0) + 1; }
    return c;
  }, [items]);
  const nameOf = (id: string) => (id === NONE ? "Tanpa grup" : groups?.find((g) => g.id === id)?.name ?? "-");
  const inOpen = useMemo(() => {
    if (!open) return [];
    const term = q.trim().toLowerCase();
    return items.filter((it) => (it.group_id ?? NONE) === open && (!term || it.name.toLowerCase().includes(term) || it.code?.toLowerCase().includes(term)));
  }, [items, open, q]);

  function openGroup(id: string) { setPicked(new Set()); setTarget(""); setQ(""); router.push(`/pengaturan/grup?g=${id}`); }
  function toggle(id: string) { setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  const allPicked = inOpen.length > 0 && inOpen.every((it) => picked.has(it.id));

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !edit) return;
    const name = edit.name.trim();
    if (!name) return;
    if (groups?.some((g) => g.id !== edit.id && g.name.trim().toLowerCase() === name.toLowerCase())) { toast("Nama grup sudah dipakai", "err"); return; }
    setBusy(true);
    const sb = supabase();
    const { error } = edit.id
      ? await sb.from("item_groups").update({ name }).eq("id", edit.id)
      : await sb.from("item_groups").insert({ tenant_id: tenant.id, name });
    setBusy(false);
    if (error) { toast(errorMessage(error), "err"); return; }
    toast(edit.id ? "Nama grup diubah" : "Grup ditambahkan");
    setEdit(null);
    load();
  }

  async function removeGroup() {
    if (!del) return;
    setBusy(true);
    const sb = supabase();
    try {
      if (moveTo !== NONE && (count[del.id] ?? 0) > 0) {
        const { error } = await sb.from("items").update({ group_id: moveTo }).eq("group_id", del.id);
        if (error) throw error;
      }
      const { error } = await sb.from("item_groups").delete().eq("id", del.id);
      if (error) throw error;
      toast(`Grup “${del.name}” dihapus`);
      if (open === del.id) router.replace("/pengaturan/grup");
      setDel(null); setEdit(null);
      await load();
    } catch (e) { toast(errorMessage(e), "err"); } finally { setBusy(false); }
  }

  async function moveItems() {
    if (!target || !picked.size) return;
    setBusy(true);
    const ids = [...picked];
    const sb = supabase();
    try {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await sb.from("items").update({ group_id: target === NONE ? null : target }).in("id", ids.slice(i, i + 200));
        if (error) throw error;
      }
      toast(`${ids.length} barang dipindah ke ${nameOf(target)}`);
      setPicked(new Set()); setTarget("");
      await load();
    } catch (e) { toast(errorMessage(e), "err"); } finally { setBusy(false); }
  }

  if (!groups) return <><PageHeader title="Grup barang" back="/menu" /><Spinner /></>;

  // ——— Isi satu grup ———
  if (open) {
    return (
      <>
        <PageHeader title={nameOf(open)} subtitle={`${count[open] ?? 0} barang`} back="/pengaturan/grup"
          right={isOwner && open !== NONE ? <button onClick={() => setEdit({ id: open, name: nameOf(open) })} className="h-11 rounded-xl2 border border-line-strong px-3 text-sm font-bold text-brand">Ubah grup</button> : undefined} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-40 lg:px-6">
          <label className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong bg-white px-3">
            <IconSearch size={18} className="text-ink-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari barang di grup ini" aria-label="Cari barang" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </label>
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <button onClick={() => setPicked(allPicked ? new Set() : new Set(inOpen.map((it) => it.id)))} className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-3 text-left text-sm font-semibold">
              <Check on={allPicked} />{allPicked ? "Batal pilih semua" : `Pilih semua (${inOpen.length})`}
            </button>
            {inOpen.map((it) => (
              <button key={it.id} onClick={() => toggle(it.id)} className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-2.5 text-left last:border-b-0 active:bg-canvas">
                <Check on={picked.has(it.id)} />
                <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#F2F4F7] text-[#98A2B3]">
                  {it.image_urls?.[0] ? <img src={it.image_urls[0]} alt="" className="h-full w-full bg-white object-contain" /> : <IconBox size={18} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{it.name}</span>
                  <span className="truncate text-xs text-ink-muted">{it.code ?? "Tanpa kode"}</span>
                </span>
              </button>
            ))}
            {inOpen.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink-muted">Tidak ada barang.</p> : null}
          </section>
        </div>
        <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-line bg-white px-4 pt-3 lg:left-64">
          <span className="text-xs font-semibold text-ink-3">{picked.size ? `${picked.size} barang dipilih · pindahkan ke` : "Centang barang yang salah grup, lalu pilih grup tujuan"}</span>
          <div className="mb-3 flex gap-2">
            <Select aria-label="Grup tujuan" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!picked.size} className="flex-1">
              <option value="">Pilih grup tujuan</option>
              {groups.filter((g) => g.id !== open).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              {open !== NONE ? <option value={NONE}>Tanpa grup</option> : null}
            </Select>
            <Button onClick={moveItems} loading={busy} disabled={!picked.size || !target}>Pindahkan</Button>
          </div>
        </footer>
        {edit ? <GroupSheet edit={edit} setEdit={setEdit} busy={busy} onSave={saveGroup} onDelete={isOwner && edit.id ? () => { setDel(groups.find((g) => g.id === edit.id) ?? null); setMoveTo(NONE); } : undefined} /> : null}
        {del ? <DeleteSheet del={del} n={count[del.id] ?? 0} groups={groups} moveTo={moveTo} setMoveTo={setMoveTo} busy={busy} onCancel={() => setDel(null)} onConfirm={removeGroup} /> : null}
      </>
    );
  }

  // ——— Daftar grup ———
  return (
    <>
      <PageHeader title="Grup barang" subtitle={`${groups.length} grup · ${items.length} barang`} back="/menu"
        right={<button onClick={() => setEdit({ name: "" })} className="flex h-11 items-center gap-1.5 rounded-xl2 bg-brand px-3 text-sm font-bold text-white"><IconPlus size={18} />Grup</button>} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <p className="text-sm text-ink-muted">Ketuk grup untuk melihat barangnya dan memindahkan barang yang salah grup.{isOwner ? " Ketuk Ubah untuk mengganti nama atau menghapus grup." : ""}</p>
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center border-b border-[#EEF0F3] last:border-b-0">
              <button onClick={() => openGroup(g.id)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left active:bg-canvas">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand"><IconBox size={19} /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{g.name}</span>
                  <span className="text-xs text-ink-muted">{count[g.id] ?? 0} barang</span>
                </span>
                <IconChevron size={18} className="text-[#98A2B3]" />
              </button>
              {isOwner ? <button onClick={() => setEdit({ id: g.id, name: g.name })} className="mr-3 h-9 flex-none rounded-lg border border-line-strong px-3 text-[13px] font-bold text-brand">Ubah</button> : null}
            </div>
          ))}
          <button onClick={() => openGroup(NONE)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-canvas">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#F2F4F7] text-ink-muted"><IconBox size={19} /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold text-ink-2">Tanpa grup</span>
              <span className="text-xs text-ink-muted">{count[NONE] ?? 0} barang</span>
            </span>
            <IconChevron size={18} className="text-[#98A2B3]" />
          </button>
        </section>
      </div>
      {edit ? <GroupSheet edit={edit} setEdit={setEdit} busy={busy} onSave={saveGroup} onDelete={isOwner && edit.id ? () => { setDel(groups.find((g) => g.id === edit.id) ?? null); setMoveTo(NONE); } : undefined} /> : null}
      {del ? <DeleteSheet del={del} n={count[del.id] ?? 0} groups={groups} moveTo={moveTo} setMoveTo={setMoveTo} busy={busy} onCancel={() => setDel(null)} onConfirm={removeGroup} /> : null}
    </>
  );
}

function Check({ on }: { on: boolean }) {
  return <span className={cx("flex h-6 w-6 flex-none items-center justify-center rounded-md border-2", on ? "border-brand bg-brand text-white" : "border-line-strong")}>{on ? <IconCheck size={14} /> : null}</span>;
}

function GroupSheet({ edit, setEdit, busy, onSave, onDelete }: { edit: { id?: string; name: string }; setEdit: (e: { id?: string; name: string } | null) => void; busy: boolean; onSave: (e: React.FormEvent) => void; onDelete?: () => void }) {
  return (
    <Sheet open onClose={() => setEdit(null)} title={edit.id ? "Ubah grup" : "Grup baru"}>
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <Field label="Nama grup" htmlFor="gn"><Input id="gn" autoFocus required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Contoh: Perabot makan" /></Field>
        <Button type="submit" loading={busy}>Simpan</Button>
        {onDelete ? <Button type="button" variant="danger" onClick={onDelete}>Hapus grup</Button> : null}
      </form>
    </Sheet>
  );
}

function DeleteSheet({ del, n, groups, moveTo, setMoveTo, busy, onCancel, onConfirm }: { del: ItemGroup; n: number; groups: ItemGroup[]; moveTo: string; setMoveTo: (v: string) => void; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Sheet open onClose={onCancel} title={`Hapus grup “${del.name}”?`}>
      <div className="flex flex-col gap-4">
        {n > 0 ? (
          <>
            <p className="text-sm text-ink-2">Grup ini berisi <b>{n} barang</b>. Barangnya tidak ikut terhapus. Pindahkan ke:</p>
            <Select aria-label="Pindahkan barang ke" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value={NONE}>Tanpa grup</option>
              {groups.filter((g) => g.id !== del.id).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </>
        ) : <p className="text-sm text-ink-2">Grup ini kosong.</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Batal</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={onConfirm}>Hapus grup</Button>
        </div>
      </div>
    </Sheet>
  );
}

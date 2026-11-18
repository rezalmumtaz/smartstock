"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_DESC, ROLE_LABEL } from "@/lib/access";
import { IconPlus, IconUsers } from "@/components/icons";
import { Badge, Button, Field, Input, PageHeader, Sheet, Spinner, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Role } from "@/lib/types";

interface Member { membership_id: string; user_id: string; email: string; role: Role; warehouse_ids: string[] }
interface Invite { id: string; email: string; role: Role; warehouse_ids: string[]; created_at: string }

export default function TimPage() {
  const { tenant, isOwner, warehouses, session } = useApp();
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [form, setForm] = useState<{ email: string; role: Role; whs: string[]; existing?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    const sb = supabase();
    const [{ data, error }, inv] = await Promise.all([
      sb.rpc("list_members", { p_tenant: tenant.id }),
      sb.rpc("list_invites", { p_tenant: tenant.id }),
    ]);
    if (error) toast(errorMessage(error), "err");
    setMembers((data ?? []) as Member[]);
    setInvites((inv.data ?? []) as Invite[]);
  }, [tenant, toast]);

  useEffect(() => { if (isOwner) load(); }, [isOwner, load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !form) return;
    if (form.role !== "owner" && form.whs.length === 0) { toast(`Pilih minimal 1 gudang untuk ${ROLE_LABEL[form.role].toLowerCase()}`, "err"); return; }
    setBusy(true);
    const { data, error } = await supabase().rpc("set_member", { p_tenant: tenant.id, p_email: form.email.trim(), p_role: form.role, p_warehouse_ids: form.role === "owner" ? [] : form.whs });
    setBusy(false);
    if (error) { toast(errorMessage(error), "err"); return; }
    toast(data ? "Akses tim disimpan" : `Undangan dibuat. ${form.email.trim()} otomatis bisa gabung setelah daftar.`);
    setForm(null);
    load();
  }

  async function cancelInvite(i: Invite) {
    if (!confirm(`Batalkan undangan untuk ${i.email}?`)) return;
    const { error } = await supabase().rpc("cancel_invite", { p_invite: i.id });
    if (error) toast(errorMessage(error), "err"); else { toast("Undangan dibatalkan"); load(); }
  }

  async function remove(m: Member) {
    if (!confirm(`Hapus ${m.email} dari tim?`)) return;
    const { error } = await supabase().rpc("remove_member", { p_membership: m.membership_id });
    if (error) toast(errorMessage(error), "err"); else { toast("Anggota dihapus"); setForm(null); load(); }
  }

  if (!isOwner) return <><PageHeader title="Tim & akses" back="/pengaturan" /><p className="p-6 text-center text-sm text-ink-muted">Hanya owner yang bisa mengatur tim.</p></>;

  const whName = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  return (
    <>
      <PageHeader title="Tim & akses" back="/pengaturan"
        right={<button onClick={() => setForm({ email: "", role: "admin_gudang", whs: [] })} className="flex h-11 items-center gap-1.5 rounded-xl2 bg-brand px-3 text-sm font-bold text-white"><IconPlus size={18} />Anggota</button>} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <p className="rounded-xl2 bg-canvas p-3 text-xs leading-relaxed text-ink-3">
          <b>Owner</b> melihat semua gudang, harga, dan laporan bisnis. <b>Admin gudang</b> mengelola barang dan stok (tanpa harga) di gudang yang ditugaskan. <b>Supervisor</b> hanya bisa mengisi dan mengubah stok di gudang yang ditugaskan; menu lain disembunyikan. Email yang belum terdaftar tetap bisa ditambahkan: orangnya cukup daftar dengan email itu, lalu ketuk <b>Cek undangan</b> di layar awal.
        </p>
        {!members ? <Spinner /> : (
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            {members.map((m) => (
              <button key={m.membership_id} onClick={() => setForm({ email: m.email, role: m.role, whs: m.warehouse_ids, existing: m.membership_id })}
                disabled={m.user_id === session?.user.id}
                className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-3.5 text-left last:border-b-0 enabled:active:bg-canvas">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas text-ink-2"><IconUsers size={18} /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{m.email}{m.user_id === session?.user.id ? " (Anda)" : ""}</span>
                  <span className="truncate text-xs text-ink-muted">{m.role === "owner" ? "Semua gudang" : m.warehouse_ids.map((w) => whName[w]).filter(Boolean).join(", ")}</span>
                </span>
                <Badge tone={m.role === "owner" ? "green" : "gray"}>{ROLE_LABEL[m.role]}</Badge>
              </button>
            ))}
          </section>
        )}
        {invites.length ? (
          <>
            <h2 className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Menunggu daftar ({invites.length})</h2>
            <section className="overflow-hidden rounded-2xl border border-line bg-white">
              {invites.map((i) => (
                <div key={i.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4 py-3.5 last:border-b-0">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-dashed border-line-strong text-ink-muted"><IconUsers size={18} /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{i.email}</span>
                    <span className="truncate text-xs text-ink-muted">{i.role === "owner" ? "Owner · semua gudang" : `${ROLE_LABEL[i.role]} · ${i.warehouse_ids.map((w) => whName[w]).filter(Boolean).join(", ")}`}</span>
                  </span>
                  <button onClick={() => cancelInvite(i)} className="h-9 flex-none rounded-xl2 border border-line-strong px-3 text-xs font-bold text-danger">Batalkan</button>
                </div>
              ))}
            </section>
            <p className="text-xs text-ink-muted">Undangan ini aktif setelah orangnya daftar dengan email tersebut dan mengetuk <b>Cek undangan</b>.</p>
          </>
        ) : null}
      </div>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.existing ? "Ubah akses" : "Tambah anggota"}>
        {form ? (
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="em" hint={form.existing ? undefined : "Belum punya akun? Tidak apa-apa, undangan tersimpan sampai dia daftar dengan email ini"}>
              <Input id="em" type="email" required disabled={!!form.existing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-3">Role</span>
              <div className="flex gap-1.5 rounded-xl2 bg-[#F2F4F7] p-1">
                {(["supervisor", "admin_gudang", "owner"] as Role[]).map((r) => (
                  <button type="button" key={r} onClick={() => setForm({ ...form, role: r })} className={form.role === r ? "h-10 flex-1 rounded-[10px] bg-white text-[13px] font-bold shadow-sm" : "h-10 flex-1 rounded-[10px] text-[13px] font-bold text-ink-muted"}>
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <span className="text-xs leading-relaxed text-ink-muted">{ROLE_DESC[form.role]}</span>
            </div>
            {form.role !== "owner" ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-xs font-semibold text-ink-3">Gudang yang boleh diakses</legend>
                {warehouses.map((w) => (
                  <label key={w.id} className="flex h-11 items-center gap-3 rounded-xl2 border border-line px-3 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-[#0E7C66]" checked={form.whs.includes(w.id)}
                      onChange={(e) => setForm({ ...form, whs: e.target.checked ? [...form.whs, w.id] : form.whs.filter((x) => x !== w.id) })} />
                    {w.name}
                  </label>
                ))}
              </fieldset>
            ) : <p className="rounded-xl2 bg-warn-soft p-3 text-xs text-warn">Owner bisa melihat dan mengubah semua data, termasuk harga, laporan, dan tim.</p>}
            <Button type="submit" loading={busy}>Simpan akses</Button>
            {form.existing ? <Button type="button" variant="danger" onClick={() => { const m = members?.find((x) => x.membership_id === form.existing); if (m) remove(m); }}>Hapus dari tim</Button> : null}
          </form>
        ) : null}
      </Sheet>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { ROLE_LABEL } from "@/lib/access";
import type { Role } from "@/lib/types";
import { errorMessage, supabase } from "@/lib/supabase";

interface Invite { id: string; tenant_id: string; tenant_name: string; role: Role; warehouse_names: string[]; invited_by_email: string | null }

/**
 * Layar awal untuk user yang belum tergabung di perusahaan mana pun.
 * Undangan dicek lebih dulu supaya admin yang diundang tidak salah membuat perusahaan baru.
 */
export default function MulaiPage() {
  const router = useRouter();
  const { ready, session, memberships, refresh, switchTenant, signOut } = useApp();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("Gudang Utama");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/masuk");
    else if (memberships.length > 0) router.replace("/");
  }, [ready, session, memberships, router]);

  const check = useCallback(async () => {
    setChecking(true); setErr(null);
    const { data, error } = await supabase().rpc("my_invites");
    setChecking(false);
    if (error) { setErr(errorMessage(error)); setInvites([]); return; }
    setInvites((data ?? []) as Invite[]);
    setCheckedAt(Date.now());
  }, []);

  useEffect(() => { if (ready && session && memberships.length === 0) check(); }, [ready, session, memberships.length, check]);

  async function respond(inv: Invite, accept: boolean) {
    if (!accept && !confirm(`Tolak undangan dari ${inv.tenant_name}?`)) return;
    setActing(inv.id); setErr(null);
    const { error } = await supabase().rpc("respond_invite", { p_invite: inv.id, p_accept: accept });
    setActing(null);
    if (error) { setErr(errorMessage(error)); check(); return; }
    if (accept) { switchTenant(inv.tenant_id); router.replace("/"); }
    else check();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase().rpc("create_tenant", { p_name: name.trim(), p_first_warehouse: warehouse.trim() });
    if (error) { setErr(errorMessage(error)); setBusy(false); return; }
    await refresh();
    router.replace("/");
  }

  if (!ready || !session) return <Spinner />;
  const email = session.user.email;
  const hasInvites = !!invites?.length;

  return (
    <AuthLayout title="Selamat datang" subtitle={`Masuk sebagai ${email}`}>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">Undangan untuk Anda</h2>
          {invites === null ? <Spinner /> : hasInvites ? (
            invites.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-bold">{inv.tenant_name}</span>
                  <span className="text-sm text-ink-2">
                    Sebagai <b>{ROLE_LABEL[inv.role]}</b>
                    {inv.role === "admin_gudang" && inv.warehouse_names.length ? ` · ${inv.warehouse_names.join(", ")}` : ""}
                  </span>
                  {inv.invited_by_email ? <span className="text-xs text-ink-muted">Diundang oleh {inv.invited_by_email}</span> : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" className="flex-1" loading={acting === inv.id} onClick={() => respond(inv, true)}>Gabung</Button>
                  <Button type="button" variant="ghost" disabled={!!acting} onClick={() => respond(inv, false)}>Tolak</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl bg-canvas p-4 text-sm leading-relaxed text-ink-2">
              <p>Belum ada undangan untuk <b>{email}</b>.</p>
              <p className="text-xs text-ink-3">Anda admin gudang atau rekan owner? <b>Jangan buat perusahaan baru.</b> Minta owner menambahkan email ini di <b>Menu → Tim &amp; akses</b>, lalu ketuk Cek undangan.</p>
              <Button type="button" variant="secondary" loading={checking} onClick={check}>Cek undangan</Button>
              {checkedAt && !checking ? <span className="text-center text-[11px] text-ink-muted">Terakhir dicek {new Date(checkedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span> : null}
            </div>
          )}
        </section>

        {err ? <p role="alert" className="rounded-xl2 bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p> : null}

        <div className="flex items-center gap-3 text-xs text-ink-muted"><span className="h-px flex-1 bg-line" />atau<span className="h-px flex-1 bg-line" /></div>

        {!showCreate ? (
          <button type="button" onClick={() => setShowCreate(true)} className="flex flex-col items-start gap-0.5 rounded-2xl border border-line-strong p-4 text-left active:bg-canvas">
            <span className="text-sm font-bold text-brand">Saya pemilik usaha, buat perusahaan baru</span>
            <span className="text-xs text-ink-muted">Untuk owner yang baru pertama kali memakai Smart Stock.</span>
          </button>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line-strong p-4">
            <h2 className="text-sm font-bold">Buat perusahaan baru</h2>
            {hasInvites ? <p className="rounded-xl2 bg-warn-soft p-3 text-xs text-warn">Anda punya undangan di atas. Jika ingin bergabung ke perusahaan itu, ketuk Gabung saja, tidak perlu membuat perusahaan baru.</p> : null}
            <Field label="Nama perusahaan / toko" htmlFor="tn"><Input id="tn" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Toko Sumber Rejeki" /></Field>
            <Field label="Nama gudang pertama" htmlFor="wh" hint="Gudang lain bisa ditambah nanti"><Input id="wh" required value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></Field>
            <Button type="submit" loading={busy}>Buat perusahaan</Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
          </form>
        )}

        <Button type="button" variant="ghost" onClick={() => signOut()}>Keluar</Button>
      </div>
    </AuthLayout>
  );
}

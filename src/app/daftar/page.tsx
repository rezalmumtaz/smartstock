"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage, supabase } from "@/lib/supabase";

export default function DaftarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setErr("Password minimal 8 karakter"); return; }
    setBusy(true); setErr(null);
    const { data, error } = await supabase().auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/mulai` },
    });
    setBusy(false);
    if (error) { setErr(errorMessage(error)); return; }
    if (data.session) router.replace("/mulai");
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Cek email Anda" subtitle={`Link konfirmasi sudah dikirim ke ${email}`}>
        <p className="text-sm leading-relaxed text-ink-3">Buka email dari Smart Stock lalu klik link konfirmasi. Setelah itu Anda bisa masuk dan membuat perusahaan.</p>
        <Link href="/masuk" className="mt-4 flex h-12 items-center justify-center rounded-xl2 bg-brand-soft font-bold text-brand">Ke halaman masuk</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Daftar Smart Stock" subtitle="Buat akun owner untuk perusahaan Anda">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" htmlFor="pw" hint="Minimal 8 karakter"><Input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err ? <p role="alert" className="rounded-xl2 bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p> : null}
        <Button type="submit" loading={busy}>Daftar</Button>
        <p className="text-center text-sm text-ink-muted">Sudah punya akun? <Link href="/masuk" className="font-bold text-brand">Masuk</Link></p>
        <p className="text-center text-xs text-ink-muted">Diundang sebagai admin gudang? Daftar dengan email yang didaftarkan owner, lalu minta owner menambahkan Anda.</p>
      </form>
    </AuthLayout>
  );
}

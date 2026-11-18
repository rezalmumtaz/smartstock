"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, Input } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { errorMessage, supabase } from "@/lib/supabase";

export default function MasukPage() {
  const router = useRouter();
  const { ready, session } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (ready && session) router.replace("/"); }, [ready, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(errorMessage(error));
    else router.replace("/");
  }

  return (
    <AuthLayout title="Masuk ke Smart Stock" subtitle="Kelola stok semua gudang dari HP">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" htmlFor="pw"><Input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err ? <p role="alert" className="rounded-xl2 bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p> : null}
        <Button type="submit" loading={busy}>Masuk</Button>
        <p className="text-center text-sm text-ink-muted">Belum punya akun? <Link href="/daftar" className="font-bold text-brand">Daftar gratis</Link></p>
      </form>
    </AuthLayout>
  );
}

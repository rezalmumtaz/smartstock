"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Scanner from "@/components/Scanner";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

/** Scan cepat dari tombol tengah: cari barang lewat barcode/kode. */
export default function ScanPage() {
  const router = useRouter();
  const { tenant } = useApp();
  const [missing, setMissing] = useState<string | null>(null);

  async function onDetected(code: string) {
    if (!tenant) return;
    const { data } = await supabase().from("items").select("id").eq("tenant_id", tenant.id).or(`barcode.eq.${code},code.eq.${code}`).limit(1);
    const hit = (data ?? [])[0] as { id: string } | undefined;
    if (hit) router.replace(`/barang/${hit.id}`);
    else setMissing(code);
  }

  return (
    <Scanner title="Scan barang" continuous onClose={() => router.back()} onDetected={(c) => { if (/^[\w\-.]+$/.test(c)) onDetected(c); else setMissing(c); }}
      footer={missing ? (
        <div className="flex flex-col gap-2 rounded-xl2 bg-warn-soft p-3">
          <span className="text-sm font-semibold text-warn">Barcode {missing} belum terdaftar</span>
          <Link href={`/barang/baru?barcode=${encodeURIComponent(missing)}`} className="flex h-11 items-center justify-center rounded-xl2 bg-brand text-sm font-bold text-white">Tambah sebagai barang baru</Link>
        </div>
      ) : <p className="text-center text-sm text-ink-muted">Arahkan kamera ke barcode. Barang yang ditemukan langsung dibuka.</p>} />
  );
}

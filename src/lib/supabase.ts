import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Satu instance Supabase untuk seluruh aplikasi (browser). */
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur");
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Ubah error Supabase/Postgres jadi pesan yang ramah dibaca. */
export function errorMessage(err: unknown): string {
  if (!err) return "Terjadi kesalahan";
  const e = err as { message?: string; code?: string };
  const msg = e.message ?? String(err);
  if (e.code === "42501" || /row-level security/i.test(msg)) return "Anda tidak punya akses untuk tindakan ini";
  if (e.code === "23505") return "Data sudah ada (kode atau barcode dipakai barang lain)";
  if (/Invalid login credentials/i.test(msg)) return "Email atau password salah";
  if (/Email not confirmed/i.test(msg)) return "Email belum dikonfirmasi. Cek kotak masuk email Anda.";
  return msg;
}

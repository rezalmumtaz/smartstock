/** Logo toko: diperkecil di browser, disimpan di Storage (folder toko), atau sebagai data URL bila Storage menolak. */
import { supabase } from "./supabase";

const BUCKET = "item-images";

/** Perkecil logo dengan menjaga transparansi (PNG). */
async function shrink(file: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!out) throw new Error("Gagal memproses gambar logo");
  return out;
}

const toDataUrl = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(b);
});

export async function uploadLogo(tenantId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar (PNG atau JPG)");
  const sb = supabase();
  const png = await shrink(file, 512);
  const path = `${tenantId}/logo/${crypto.randomUUID()}.png`;
  const { error } = await sb.storage.from(BUCKET).upload(path, png, { contentType: "image/png", cacheControl: "31536000" });
  if (!error) return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  // Storage menolak (izin folder): simpan logo kecil langsung di data toko.
  return toDataUrl(await shrink(file, 256));
}

/** Hapus file logo lama di Storage (data URL tidak perlu dihapus). */
export async function removeLogoFile(url: string | null | undefined) {
  if (!url) return;
  const i = url.indexOf(`/${BUCKET}/`);
  if (i < 0) return;
  await supabase().storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + BUCKET.length + 2).split("?")[0])]).catch(() => undefined);
}

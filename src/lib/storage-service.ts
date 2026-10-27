import { supabase } from "./supabase";

/**
 * Upload an image file to Supabase Storage and return its public URL.
 * Falls back safely to null if Supabase is unavailable or upload fails.
 */
export async function uploadImageToSupabase(
  file: File,
  bucket: "products" | "receipts" = "products"
): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn(`[Supabase Storage] Upload error to bucket ${bucket}:`, uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl || null;
  } catch (err) {
    console.warn(`[Supabase Storage] Failed to upload image:`, err);
    return null;
  }
}

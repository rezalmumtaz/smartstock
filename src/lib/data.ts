import { supabase } from "./supabase";
import type { Item, ItemGroup, ItemPrice, StockLevel } from "./types";

export interface ItemLocation { item_id: string; warehouse_id: string; location: string }

/** Ambil semua baris (melewati batas 1000 baris per request Supabase). */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export interface Catalog {
  items: Item[];
  groups: ItemGroup[];
  /** stok[itemId][warehouseId] */
  stock: Record<string, Record<string, number>>;
  /** kosong untuk admin gudang (RLS) */
  prices: Record<string, ItemPrice>;
  /** lokasi simpan: locations[itemId][warehouseId] */
  locations: Record<string, Record<string, string>>;
}

export async function loadCatalog(tenantId: string, withPrices: boolean): Promise<Catalog> {
  const sb = supabase();
  const [items, groups, levels, prices, locs] = await Promise.all([
    fetchAll<Item>((a, b) => sb.from("items").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("name").range(a, b)),
    fetchAll<ItemGroup>((a, b) => sb.from("item_groups").select("id, name").eq("tenant_id", tenantId).order("name").range(a, b)),
    fetchAll<StockLevel>((a, b) => sb.from("stock_levels").select("item_id, warehouse_id, qty").eq("tenant_id", tenantId).range(a, b)),
    withPrices
      ? fetchAll<ItemPrice>((a, b) => sb.from("item_prices").select("item_id, purchase_price, sell_price").eq("tenant_id", tenantId).range(a, b))
      : Promise.resolve([] as ItemPrice[]),
    fetchAll<ItemLocation>((a, b) => sb.from("item_locations").select("item_id, warehouse_id, location").eq("tenant_id", tenantId).range(a, b)).catch(() => [] as ItemLocation[]),
  ]);
  const stock: Catalog["stock"] = {};
  for (const l of levels) (stock[l.item_id] ??= {})[l.warehouse_id] = Number(l.qty);
  const priceMap: Catalog["prices"] = {};
  for (const p of prices) priceMap[p.item_id] = { ...p, purchase_price: Number(p.purchase_price), sell_price: Number(p.sell_price) };
  const locations: Catalog["locations"] = {};
  for (const l of locs) (locations[l.item_id] ??= {})[l.warehouse_id] = l.location;
  return { items, groups, stock, prices: priceMap, locations };
}

export function qtyIn(cat: Catalog, itemId: string, warehouseIds: string[]): number {
  const s = cat.stock[itemId];
  if (!s) return 0;
  return warehouseIds.reduce((sum, w) => sum + (s[w] ?? 0), 0);
}

export function isLow(item: Item, qty: number): boolean {
  return item.min_qty !== null && item.min_qty !== undefined && Number(item.min_qty) > 0 && qty < Number(item.min_qty);
}

/**
 * Teks lokasi simpan untuk gudang yang sedang dilihat.
 * Satu gudang: "Lt 1 · Rak kanan". Beberapa gudang: "Gudang Utama: Lt 1 · Gudang B: Rak 3".
 */
export function locationLabel(cat: Catalog, itemId: string, warehouseIds: string[], names: Record<string, string>): string {
  const l = cat.locations[itemId];
  if (!l) return "";
  const hits = warehouseIds.filter((w) => l[w]);
  if (hits.length === 0) return "";
  if (warehouseIds.length === 1) return l[hits[0]];
  return hits.map((w) => `${names[w] ?? "Gudang"}: ${l[w]}`).join(" · ");
}

/** Daftar lokasi yang pernah dipakai di gudang, untuk saran isian. */
export function knownLocations(cat: Catalog | null, warehouseId: string): string[] {
  if (!cat) return [];
  const set = new Set<string>();
  for (const per of Object.values(cat.locations)) if (per[warehouseId]) set.add(per[warehouseId]);
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

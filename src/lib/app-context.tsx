"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Membership, Role, Tenant, Warehouse } from "./types";

interface AppState {
  ready: boolean;
  session: Session | null;
  memberships: Membership[];
  tenant: Tenant | null;
  role: Role | null;
  isOwner: boolean;
  /** supervisor: hanya isi/ubah stok */
  isSupervisor: boolean;
  /** owner & admin gudang: boleh ubah barang, grup, kontak */
  canEditMaster: boolean;
  /** Gudang yang boleh diakses user (owner: semua; admin: gudang tugasnya). */
  warehouses: Warehouse[];
  /** Nama semua gudang di perusahaan (untuk tujuan transfer & label), tanpa data stok. */
  warehouseNames: Record<string, string>;
  /** "all" atau id gudang yang sedang dipilih di filter header. */
  warehouseFilter: string;
  setWarehouseFilter: (id: string) => void;
  switchTenant: (tenantId: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

const LS_TENANT = "ss.tenant";
const LS_WH = "ss.warehouse";

function lsGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function lsSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* abaikan */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseNames, setWarehouseNames] = useState<Record<string, string>>({});
  const [warehouseFilter, setFilter] = useState<string>("all");

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setMemberships([]); setTenantId(null); setWarehouses([]); setWarehouseNames({});
      setReady(true);
      return;
    }
    const sb = supabase();
    const { data: ms } = await sb
      .from("memberships")
      .select("id, tenant_id, role, tenants(*)")
      .eq("user_id", s.user.id);
    const list = (ms ?? []) as unknown as Membership[];
    setMemberships(list);
    const saved = lsGet(LS_TENANT);
    const tid = list.find((m) => m.tenant_id === saved)?.tenant_id ?? list[0]?.tenant_id ?? null;
    setTenantId(tid);
    if (tid) {
      const [{ data: whs }, { data: names }] = await Promise.all([
        sb.from("warehouses").select("*").eq("tenant_id", tid).order("name"),
        sb.rpc("list_warehouse_names", { p_tenant: tid }),
      ]);
      const visible = (whs ?? []) as Warehouse[];
      setWarehouses(visible);
      const map: Record<string, string> = {};
      for (const w of (names ?? []) as { id: string; name: string }[]) map[w.id] = w.name;
      for (const w of visible) map[w.id] = w.name;
      setWarehouseNames(map);
      const savedWh = lsGet(LS_WH);
      const isOwner = list.find((m) => m.tenant_id === tid)?.role === "owner";
      if (savedWh && (savedWh === "all" || visible.some((w) => w.id === savedWh))) setFilter(savedWh);
      else setFilter(isOwner || visible.length !== 1 ? "all" : visible[0].id);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(s);
      else setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const current = memberships.find((m) => m.tenant_id === tenantId) ?? null;

  const value = useMemo<AppState>(() => ({
    ready,
    session,
    memberships,
    tenant: current?.tenants ?? null,
    role: current?.role ?? null,
    isOwner: current?.role === "owner",
    isSupervisor: current?.role === "supervisor",
    canEditMaster: current?.role === "owner" || current?.role === "admin_gudang",
    warehouses,
    warehouseNames,
    warehouseFilter,
    setWarehouseFilter: (id: string) => { setFilter(id); lsSet(LS_WH, id); },
    switchTenant: (id: string) => { lsSet(LS_TENANT, id); lsSet(LS_WH, "all"); setReady(false); supabase().auth.getSession().then(({ data }) => load(data.session)); },
    refresh: async () => { const { data } = await supabase().auth.getSession(); await load(data.session); },
    signOut: async () => { await supabase().auth.signOut(); },
  }), [ready, session, memberships, current, warehouses, warehouseNames, warehouseFilter, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp harus di dalam AppProvider");
  return v;
}

/** Id gudang yang sedang aktif sesuai filter (semua gudang yang boleh diakses bila "all"). */
export function useActiveWarehouseIds(): string[] {
  const { warehouses, warehouseFilter } = useApp();
  return warehouseFilter === "all" ? warehouses.map((w) => w.id) : [warehouseFilter];
}

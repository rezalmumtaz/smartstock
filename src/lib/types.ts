export type Role = "owner" | "admin_gudang" | "supervisor";

export type DocType = "in" | "out" | "transfer" | "opname" | "return_in" | "return_out";
export type DocStatus = "draft" | "posted" | "in_transit" | "received" | "void";

export interface Tenant {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  npwp: string | null;
  bank_account: string | null;
  currency: string;
  locked_until: string | null;
}

export interface Membership {
  id: string;
  tenant_id: string;
  role: Role;
  tenants: Tenant;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  is_hidden: boolean;
}

export interface ItemGroup {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  tenant_id: string;
  group_id: string | null;
  name: string;
  code: string | null;
  barcode: string | null;
  description: string | null;
  unit: string | null;
  min_qty: number | null;
  is_active: boolean;
  image_urls: string[];
}

export interface ItemPrice {
  item_id: string;
  purchase_price: number;
  sell_price: number;
}

export interface StockLevel {
  item_id: string;
  warehouse_id: string;
  qty: number;
}

export interface Contact {
  id: string;
  contact_type: "supplier" | "customer";
  name: string;
  phone: string | null;
}

export interface DocumentRow {
  id: string;
  tenant_id: string;
  doc_type: DocType;
  is_order: boolean;
  number: string;
  doc_date: string;
  warehouse_id: string | null;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  contact_id: string | null;
  notes: string | null;
  status: DocStatus;
  created_at: string;
  posted_at: string | null;
  received_at: string | null;
}

export interface DocumentLine {
  id: string;
  document_id: string;
  item_id: string;
  qty: number;
  qty_system: number | null;
  qty_received: number | null;
  line_no: number;
}

export const DOC_LABEL: Record<DocType, string> = {
  in: "Barang masuk",
  out: "Barang keluar",
  transfer: "Transfer",
  opname: "Stok opname",
  return_in: "Retur dari pelanggan",
  return_out: "Retur ke pemasok",
};

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  posted: "Diposting",
  in_transit: "Dikirim",
  received: "Diterima",
  void: "Dibatalkan",
};

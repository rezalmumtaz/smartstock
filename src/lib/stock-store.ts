import { SKUWithCurrentStock, Warehouse, Contact, TransactionDoc, ExpenseItem, SKU } from "@/types/stock";

const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: "wh-1", name: "Gudang Utama", code: "GDG-01", address: "Jl. Industri Raya No. 12", is_default: true },
  { id: "wh-2", name: "Gudang Cabang Barat", code: "GDG-02", address: "Kawasan Niaga Sentra Blok B", is_default: false },
];

const INITIAL_PRODUCTS: SKUWithCurrentStock[] = [
  {
    id: "prod-1",
    kode_sku: "KOB-01",
    barcode: "899123450001",
    nama_barang: "Kopi Robusta Lampung 250g",
    deskripsi: "Biji kopi sangrai kualitas ekspor aroma wangi dan kuat",
    satuan: "Pack",
    lokasi_rak: "Rak A-01",
    harga_beli: 35000,
    harga_jual: 48000,
    batas_stok_minimum: 15,
    foto_produk_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 45,
    status_stok: "AMAN",
    total_nilai_aset: 45 * 35000,
    is_active: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-2",
    kode_sku: "BRS-01",
    barcode: "899123450002",
    nama_barang: "Beras Pandan Wangi Premium 5kg",
    deskripsi: "Beras pulen alami tanpa pemutih",
    satuan: "Sak",
    lokasi_rak: "Palet C-03",
    harga_beli: 72000,
    harga_jual: 86000,
    batas_stok_minimum: 20,
    foto_produk_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 80,
    status_stok: "AMAN",
    total_nilai_aset: 80 * 72000,
    is_active: true,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-3",
    kode_sku: "MYK-01",
    barcode: "899123450003",
    nama_barang: "Minyak Goreng Sawit 2 Liter",
    deskripsi: "Minyak goreng jernih 2x penyaringan",
    satuan: "Pcs",
    lokasi_rak: "Rak B-02",
    harga_beli: 32000,
    harga_jual: 38500,
    batas_stok_minimum: 15,
    foto_produk_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 6,
    status_stok: "KRITIS",
    total_nilai_aset: 6 * 32000,
    is_active: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-4",
    kode_sku: "SSU-01",
    barcode: "899123450004",
    nama_barang: "Susu UHT Full Cream 1 Liter",
    deskripsi: "Susu segar bernutrisi tinggi kaya kalsium",
    satuan: "Box",
    lokasi_rak: "Rak D-01",
    harga_beli: 16500,
    harga_jual: 21000,
    batas_stok_minimum: 24,
    foto_produk_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 120,
    status_stok: "AMAN",
    total_nilai_aset: 120 * 16500,
    is_active: true,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-5",
    kode_sku: "GLA-01",
    barcode: "899123450005",
    nama_barang: "Gula Pasir Kristal Putih 1kg",
    deskripsi: "Gula tebu murni manis alami",
    satuan: "Pcs",
    lokasi_rak: "Rak A-04",
    harga_beli: 14500,
    harga_jual: 17500,
    batas_stok_minimum: 20,
    foto_produk_url: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 4,
    status_stok: "KRITIS",
    total_nilai_aset: 4 * 14500,
    is_active: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-6",
    kode_sku: "MIE-01",
    barcode: "899123450006",
    nama_barang: "Mie Instan Goreng Spesial (Dus)",
    deskripsi: "1 Dus isi 40 bungkus mie goreng",
    satuan: "Dus",
    lokasi_rak: "Palet B-01",
    harga_beli: 108000,
    harga_jual: 124000,
    batas_stok_minimum: 10,
    foto_produk_url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80",
    sisa_stok: 35,
    status_stok: "AMAN",
    total_nilai_aset: 35 * 108000,
    is_active: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "cnt-1",
    type: "supplier",
    name: "PT Sumber Pangan Sejahtera",
    phone: "0812-3456-7890",
    email: "sales@sumberpangan.co.id",
    address: "Jl. Industri Manufaktur No. 88, Cikarang",
    npwp: "01.234.567.8-012.000",
    bank_account: "BCA 8820-123-999 a.n PT Sumber Pangan",
    notes: "Supplier utama sembako dan minyak",
    total_billed: 15500000,
    total_paid: 10000000,
    balance_due: 5500000,
  },
  {
    id: "cnt-2",
    type: "supplier",
    name: "Distributor Kopi & Rempah Nusantara",
    phone: "0819-8765-4321",
    email: "order@kopinusantara.com",
    address: "Sentra Kopi Indonesia No. 4, Lampung",
    npwp: "02.888.777.6-432.000",
    bank_account: "Mandiri 132-00-9876543-1 a.n Kopi Nusantara",
    notes: "Pengiriman tiap hari Selasa & Jumat",
    total_billed: 8200000,
    total_paid: 8200000,
    balance_due: 0,
  },
  {
    id: "cnt-3",
    type: "customer",
    name: "Toko Berkah Mandiri",
    phone: "0856-1122-3344",
    email: "tokoberkah@gmail.com",
    address: "Pasar Baru Blok A No. 15",
    npwp: "09.111.222.3-444.000",
    notes: "Langganan grosir mingguan (Tempo 7 hari)",
    price_tier: "wholesale",
    discount_percent: 2,
    total_billed: 12400000,
    total_paid: 10000000,
    balance_due: 2400000,
  },
  {
    id: "cnt-4",
    type: "customer",
    name: "Warung Sembako Bu Siti",
    phone: "0878-5544-3322",
    email: "busiti@yahoo.com",
    address: "Jl. Pemuda No. 42",
    notes: "Pembayaran selalu tunai (cash on delivery)",
    price_tier: "retail",
    total_billed: 4500000,
    total_paid: 4500000,
    balance_due: 0,
  },
];

const INITIAL_TRANSACTIONS: TransactionDoc[] = [
  {
    id: "tx-1",
    doc_number: "IN-000001",
    type: "masuk",
    warehouse_id: "wh-1",
    contact_id: "cnt-1",
    contact_name: "PT Sumber Pangan Sejahtera",
    transaction_date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    subtotal: 5400000,
    grand_total: 5400000,
    payment_status: "paid",
    notes: "Penerimaan barang stok mingguan",
    items: [
      {
        id: "item-1",
        sku_id: "prod-2",
        kode_sku: "BRS-01",
        nama_barang: "Beras Pandan Wangi Premium 5kg",
        quantity: 50,
        unit_price: 72000,
        total_price: 3600000,
      },
      {
        id: "item-2",
        sku_id: "prod-4",
        kode_sku: "SSU-01",
        nama_barang: "Susu UHT Full Cream 1 Liter",
        quantity: 100,
        unit_price: 16500,
        total_price: 1650000,
      },
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "tx-2",
    doc_number: "OUT-000001",
    type: "keluar",
    warehouse_id: "wh-1",
    contact_id: "cnt-3",
    contact_name: "Toko Berkah Mandiri",
    transaction_date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    discount_percent: 2,
    subtotal: 2480000,
    grand_total: 2430400,
    payment_status: "unpaid",
    notes: "Pesanan mingguan toko berkah",
    items: [
      {
        id: "item-3",
        sku_id: "prod-6",
        kode_sku: "MIE-01",
        nama_barang: "Mie Instan Goreng Spesial (Dus)",
        quantity: 20,
        unit_price: 124000,
        total_price: 2480000,
      },
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "exp-1",
    warehouse_id: "wh-1",
    expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    amount: 450000,
    category: "Listrik & Air",
    name: "Tagihan Listrik PLN Gudang Utama",
    notes: "Token listrik periode Oktober",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "exp-2",
    warehouse_id: "wh-1",
    expense_date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    amount: 180000,
    category: "Packing & Lakban",
    name: "Beli Lakban Coklat 6 Roll & Bubble Wrap",
    notes: "Perlengkapan packing kiriman grosir",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

class StockStore {
  private products: SKUWithCurrentStock[] = [];
  private warehouses: Warehouse[] = [];
  private activeWarehouseId: string = "wh-1";
  private contacts: Contact[] = [];
  private transactions: TransactionDoc[] = [];
  private expenses: ExpenseItem[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    } else {
      this.products = [...INITIAL_PRODUCTS];
      this.warehouses = [...INITIAL_WAREHOUSES];
      this.contacts = [...INITIAL_CONTACTS];
      this.transactions = [...INITIAL_TRANSACTIONS];
      this.expenses = [...INITIAL_EXPENSES];
    }
  }

  private loadFromStorage() {
    try {
      const p = localStorage.getItem("mm_products");
      this.products = p ? JSON.parse(p) : [...INITIAL_PRODUCTS];

      const w = localStorage.getItem("mm_warehouses");
      this.warehouses = w ? JSON.parse(w) : [...INITIAL_WAREHOUSES];

      const aw = localStorage.getItem("mm_active_warehouse");
      this.activeWarehouseId = aw || "wh-1";

      const c = localStorage.getItem("mm_contacts");
      this.contacts = c ? JSON.parse(c) : [...INITIAL_CONTACTS];

      const t = localStorage.getItem("mm_transactions");
      this.transactions = t ? JSON.parse(t) : [...INITIAL_TRANSACTIONS];

      const e = localStorage.getItem("mm_expenses");
      this.expenses = e ? JSON.parse(e) : [...INITIAL_EXPENSES];
    } catch (err) {
      console.warn("Error loading local storage, using initial seed:", err);
      this.products = [...INITIAL_PRODUCTS];
      this.warehouses = [...INITIAL_WAREHOUSES];
      this.contacts = [...INITIAL_CONTACTS];
      this.transactions = [...INITIAL_TRANSACTIONS];
      this.expenses = [...INITIAL_EXPENSES];
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("mm_products", JSON.stringify(this.products));
      localStorage.setItem("mm_warehouses", JSON.stringify(this.warehouses));
      localStorage.setItem("mm_active_warehouse", this.activeWarehouseId);
      localStorage.setItem("mm_contacts", JSON.stringify(this.contacts));
      localStorage.setItem("mm_transactions", JSON.stringify(this.transactions));
      localStorage.setItem("mm_expenses", JSON.stringify(this.expenses));
    } catch (err) {
      console.error("Failed to save to local storage:", err);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- WAREHOUSE ---
  public getWarehouses(): Warehouse[] {
    return this.warehouses;
  }

  public getActiveWarehouse(): Warehouse {
    return this.warehouses.find((w) => w.id === this.activeWarehouseId) || this.warehouses[0];
  }

  public setActiveWarehouse(id: string) {
    this.activeWarehouseId = id;
    this.saveToStorage();
  }

  public addWarehouse(name: string, code: string, address?: string) {
    const newWh: Warehouse = {
      id: "wh-" + Date.now(),
      name,
      code,
      address,
      is_default: false,
    };
    this.warehouses.push(newWh);
    this.saveToStorage();
    return newWh;
  }

  // --- PRODUCTS ---
  public getProducts(): SKUWithCurrentStock[] {
    return this.products;
  }

  public getProductById(id: string): SKUWithCurrentStock | undefined {
    return this.products.find((p) => p.id === id);
  }

  public getProductByBarcodeOrSku(query: string): SKUWithCurrentStock | undefined {
    const q = query.trim().toLowerCase();
    return this.products.find(
      (p) => p.barcode.toLowerCase() === q || p.kode_sku.toLowerCase() === q
    );
  }

  public addProduct(
    productData: Omit<SKU, "id" | "created_at" | "updated_at">,
    initialStock: number = 0
  ): SKUWithCurrentStock {
    const status_stok =
      initialStock <= 0
        ? "KOSONG"
        : initialStock <= productData.batas_stok_minimum
        ? "KRITIS"
        : "AMAN";

    const newProd: SKUWithCurrentStock = {
      ...productData,
      id: "prod-" + Date.now(),
      sisa_stok: initialStock,
      status_stok,
      total_nilai_aset: initialStock * productData.harga_beli,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.products.unshift(newProd);

    // Jika ada stok awal, catat sebagai transaksi masuk awal
    if (initialStock > 0) {
      this.createTransaction({
        type: "masuk",
        warehouse_id: this.activeWarehouseId,
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "Saldo Awal Produk Baru",
        payment_status: "paid",
        items: [
          {
            id: "item-" + Date.now(),
            sku_id: newProd.id,
            kode_sku: newProd.kode_sku,
            nama_barang: newProd.nama_barang,
            quantity: initialStock,
            unit_price: newProd.harga_beli,
            total_price: initialStock * newProd.harga_beli,
          },
        ],
      });
    }

    this.saveToStorage();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<SKU>): SKUWithCurrentStock | null {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = this.products[index];
    const updated: SKUWithCurrentStock = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Recompute status & nilai aset
    updated.status_stok =
      updated.sisa_stok <= 0
        ? "KOSONG"
        : updated.sisa_stok <= updated.batas_stok_minimum
        ? "KRITIS"
        : "AMAN";
    updated.total_nilai_aset = updated.sisa_stok * updated.harga_beli;

    this.products[index] = updated;
    this.saveToStorage();
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    if (this.products.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // --- CONTACTS ---
  public getContacts(type?: "supplier" | "customer"): Contact[] {
    if (type) return this.contacts.filter((c) => c.type === type);
    return this.contacts;
  }

  public addContact(contact: Omit<Contact, "id" | "total_billed" | "total_paid" | "balance_due">): Contact {
    const newContact: Contact = {
      ...contact,
      id: "cnt-" + Date.now(),
      total_billed: 0,
      total_paid: 0,
      balance_due: 0,
    };
    this.contacts.unshift(newContact);
    this.saveToStorage();
    return newContact;
  }

  public updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const idx = this.contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.contacts[idx] = { ...this.contacts[idx], ...updates };
    this.saveToStorage();
    return this.contacts[idx];
  }

  // --- TRANSACTIONS ---
  public getTransactions(type?: string): TransactionDoc[] {
    if (type && type !== "semua") {
      return this.transactions.filter((t) => t.type === type);
    }
    return this.transactions;
  }

  public createTransaction(
    txData: Omit<TransactionDoc, "id" | "doc_number" | "subtotal" | "grand_total" | "created_at"> & {
      doc_number?: string;
    }
  ): TransactionDoc {
    const subtotal = txData.items.reduce((acc, item) => acc + item.total_price, 0);
    const discount = txData.discount_percent ? (subtotal * txData.discount_percent) / 100 : 0;
    const grand_total = Math.max(0, subtotal - discount);

    const docPrefix =
      txData.type === "masuk"
        ? "IN-"
        : txData.type === "keluar"
        ? "OUT-"
        : txData.type === "opname"
        ? "OPN-"
        : "DOC-";

    const nextNumber = String(this.transactions.length + 1).padStart(6, "0");
    const doc_number = txData.doc_number || `${docPrefix}${nextNumber}`;

    const newTx: TransactionDoc = {
      ...txData,
      id: "tx-" + Date.now(),
      doc_number,
      subtotal,
      grand_total,
      created_at: new Date().toISOString(),
    };

    // Mutasi stok barang
    txData.items.forEach((item) => {
      const prod = this.products.find((p) => p.id === item.sku_id);
      if (prod) {
        if (txData.type === "masuk" || txData.type === "retur_pelanggan") {
          prod.sisa_stok += item.quantity;
        } else if (txData.type === "keluar" || txData.type === "retur_pemasok") {
          prod.sisa_stok = Math.max(0, prod.sisa_stok - item.quantity);
        }

        prod.status_stok =
          prod.sisa_stok <= 0
            ? "KOSONG"
            : prod.sisa_stok <= prod.batas_stok_minimum
            ? "KRITIS"
            : "AMAN";
        prod.total_nilai_aset = prod.sisa_stok * prod.harga_beli;
        prod.last_mutation_at = new Date().toISOString();
      }
    });

    // Update kontak (hutang / piutang) jika ada contact_id
    if (newTx.contact_id) {
      const contact = this.contacts.find((c) => c.id === newTx.contact_id);
      if (contact) {
        contact.total_billed += grand_total;
        if (newTx.payment_status === "paid") {
          contact.total_paid += grand_total;
        }
        contact.balance_due = Math.max(0, contact.total_billed - contact.total_paid);
      }
    }

    this.transactions.unshift(newTx);
    this.saveToStorage();
    return newTx;
  }

  // --- EXPENSES ---
  public getExpenses(): ExpenseItem[] {
    return this.expenses;
  }

  public addExpense(expense: Omit<ExpenseItem, "id" | "created_at">): ExpenseItem {
    const newExp: ExpenseItem = {
      ...expense,
      id: "exp-" + Date.now(),
      created_at: new Date().toISOString(),
    };
    this.expenses.unshift(newExp);
    this.saveToStorage();
    return newExp;
  }

  // --- SUMMARY METRICS (Untuk Dashboard Tiles) ---
  public getSummary() {
    const totalItems = this.products.length;
    const totalAssetValuation = this.products.reduce((acc, p) => acc + p.total_nilai_aset, 0);
    const totalDocuments = this.transactions.length;
    const criticalItemsCount = this.products.filter((p) => p.status_stok === "KRITIS" || p.status_stok === "KOSONG").length;
    const totalExpenses = this.expenses.reduce((acc, e) => acc + e.amount, 0);

    return {
      totalItems,
      totalAssetValuation,
      totalDocuments,
      criticalItemsCount,
      totalExpenses,
    };
  }
}

export const stockStore = new StockStore();

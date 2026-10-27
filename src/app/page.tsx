"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SidebarDrawer } from "@/components/SidebarDrawer";
import { DashboardTiles } from "@/components/DashboardTiles";
import { ProductListModal } from "@/components/ProductListModal";
import { ProductFormModal } from "@/components/ProductFormModal";
import { AddDocumentSheet } from "@/components/AddDocumentSheet";
import { StockTransactionModal } from "@/components/StockTransactionModal";
import { DocumentListModal } from "@/components/DocumentListModal";
import { VoiceNoteModal } from "@/components/VoiceNoteModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { ContactsModal } from "@/components/ContactsModal";
import { ExpensesModal } from "@/components/ExpensesModal";
import { ReportsModal } from "@/components/ReportsModal";
import { SettingsModal } from "@/components/SettingsModal";
import { stockStore } from "@/lib/stock-store";
import {
  SKUWithCurrentStock,
  Warehouse,
  Contact,
  TransactionDoc,
  ExpenseItem,
  TransactionType,
  VoiceParseResult,
  SKU,
} from "@/types/stock";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  // Store Data States
  const [products, setProducts] = useState<SKUWithCurrentStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse>({
    id: "wh-1",
    name: "Gudang Utama",
    code: "GDG-01",
    is_default: true,
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalAssetValuation: 0,
    totalDocuments: 0,
    criticalItemsCount: 0,
    totalExpenses: 0,
  });

  // UI Modal & Navigation States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<SKUWithCurrentStock | null>(null);

  const [isAddDocSheetOpen, setIsAddDocSheetOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [currentTxType, setCurrentTxType] = useState<TransactionType>("masuk");
  const [preselectedProdForTx, setPreselectedProdForTx] = useState<SKUWithCurrentStock | null>(null);

  const [isDocsListOpen, setIsDocsListOpen] = useState(false);
  const [isVoiceAIOpen, setIsVoiceAIOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [contactInitialType, setContactInitialType] = useState<"supplier" | "customer">("supplier");

  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync state from stockStore
  const refreshFromStore = () => {
    setProducts(stockStore.getProducts());
    setWarehouses(stockStore.getWarehouses());
    setActiveWarehouse(stockStore.getActiveWarehouse());
    setContacts(stockStore.getContacts());
    setTransactions(stockStore.getTransactions());
    setExpenses(stockStore.getExpenses());
    setSummary(stockStore.getSummary());
  };

  useEffect(() => {
    refreshFromStore();
    const unsubscribe = stockStore.subscribe(refreshFromStore);
    return () => unsubscribe();
  }, []);

  // Handlers
  const handleSelectWarehouse = (id: string) => {
    stockStore.setActiveWarehouse(id);
    setActiveWarehouse(stockStore.getActiveWarehouse());
  };

  const handleOpenStockIn = (preselected?: SKUWithCurrentStock) => {
    setCurrentTxType("masuk");
    setPreselectedProdForTx(preselected || null);
    setIsTxModalOpen(true);
  };

  const handleOpenStockOut = (preselected?: SKUWithCurrentStock) => {
    setCurrentTxType("keluar");
    setPreselectedProdForTx(preselected || null);
    setIsTxModalOpen(true);
  };

  const handleSelectDocType = (type: TransactionType) => {
    setCurrentTxType(type);
    setPreselectedProdForTx(null);
    setIsTxModalOpen(true);
  };

  // Voice AI Action Handler
  const handleVoiceParseResult = (result: VoiceParseResult) => {
    if (result.action === "TAMBAH_BARANG") {
      setProductToEdit(null);
      setIsProductFormOpen(true);
    } else if (result.action === "BARANG_MASUK") {
      let matchedProd = products.find((p) =>
        result.nama_barang
          ? p.nama_barang.toLowerCase().includes(result.nama_barang.toLowerCase())
          : false
      );
      handleOpenStockIn(matchedProd);
    } else if (result.action === "BARANG_KELUAR") {
      let matchedProd = products.find((p) =>
        result.nama_barang
          ? p.nama_barang.toLowerCase().includes(result.nama_barang.toLowerCase())
          : false
      );
      handleOpenStockOut(matchedProd);
    } else if (result.action === "BIAYA") {
      setIsExpensesOpen(true);
    }
  };

  // Barcode Scan Match Handler
  const handleBarcodeScanned = (code: string) => {
    const matched = stockStore.getProductByBarcodeOrSku(code);
    setIsScannerOpen(false);
    if (matched) {
      handleOpenStockOut(matched);
    } else {
      if (confirm(`Barcode "${code}" belum terdaftar. Tambahkan sebagai barang baru?`)) {
        setProductToEdit(null);
        setIsProductFormOpen(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 1. Top Header Bar (StoDo Simple Inspired) */}
      <Header
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenVoiceAI={() => setIsVoiceAIOpen(true)}
        warehouses={warehouses}
        activeWarehouse={activeWarehouse}
        onSelectWarehouse={handleSelectWarehouse}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-5 flex flex-col justify-center">
        {/* Banner Quick Notification if Low Stock */}
        {summary.criticalItemsCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsProductsOpen(true);
            }}
            className="mb-3 w-full bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs hover:bg-rose-100/80 transition-colors text-left"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>
                Peringatan: Ada <strong>{summary.criticalItemsCount} item</strong> stok hampir habis!
              </span>
            </div>
            <span className="text-[11px] underline font-bold">Cek Barang &rarr;</span>
          </button>
        )}

        {/* 3. 8-Tile Teal Grid Dashboard & 4 Quick Buttons */}
        <DashboardTiles
          totalItems={summary.totalItems}
          totalAssetValue={summary.totalAssetValuation}
          totalDocuments={summary.totalDocuments}
          totalExpenses={summary.totalExpenses}
          onOpenProducts={() => setIsProductsOpen(true)}
          onOpenDocuments={() => setIsDocsListOpen(true)}
          onOpenReports={() => setIsReportsOpen(true)}
          onOpenExpenses={() => setIsExpensesOpen(true)}
          onOpenStockIn={() => handleOpenStockIn()}
          onOpenStockOut={() => handleOpenStockOut()}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenVoiceAI={() => setIsVoiceAIOpen(true)}
          onOpenSuppliers={() => {
            setContactInitialType("supplier");
            setIsContactsOpen(true);
          }}
          onOpenCustomers={() => {
            setContactInitialType("customer");
            setIsContactsOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={() => setIsReportsOpen(true)}
        />
      </main>

      {/* 4. Navigation Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView="dashboard"
        onNavigate={(view) => {
          if (view === "products") setIsProductsOpen(true);
          else if (view === "documents") setIsDocsListOpen(true);
          else if (view === "expenses") setIsExpensesOpen(true);
          else if (view === "reports") setIsReportsOpen(true);
          else if (view === "suppliers") {
            setContactInitialType("supplier");
            setIsContactsOpen(true);
          } else if (view === "customers") {
            setContactInitialType("customer");
            setIsContactsOpen(true);
          } else if (view === "settings" || view === "warehouses" || view === "subscription") {
            setIsSettingsOpen(true);
          }
        }}
      />

      {/* 5. Modul Daftar Barang (Product List) */}
      <ProductListModal
        isOpen={isProductsOpen}
        onClose={() => setIsProductsOpen(false)}
        products={products}
        activeWarehouse={activeWarehouse}
        onAddNewProduct={() => {
          setProductToEdit(null);
          setIsProductFormOpen(true);
        }}
        onEditProduct={(p) => {
          setProductToEdit(p);
          setIsProductFormOpen(true);
        }}
        onDeleteProduct={(id) => stockStore.deleteProduct(id)}
        onQuickStockIn={(p) => handleOpenStockIn(p)}
        onQuickStockOut={(p) => handleOpenStockOut(p)}
      />

      {/* 6. Form Tambah / Edit Barang (Add Product Modal with Image Uploader) */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        activeWarehouse={activeWarehouse}
        productToEdit={productToEdit}
        onOpenScanner={() => setIsScannerOpen(true)}
        onSave={(data, qty) => {
          if (productToEdit) {
            stockStore.updateProduct(productToEdit.id, data);
          } else {
            stockStore.addProduct(data, qty);
          }
        }}
      />

      {/* 7. Bottom Sheet Tambah Dokumen (Add Document Sheet) */}
      <AddDocumentSheet
        isOpen={isAddDocSheetOpen}
        onClose={() => setIsAddDocSheetOpen(false)}
        onSelectType={handleSelectDocType}
      />

      {/* 8. Form Transaksi Masuk / Keluar (Stock Transaction Modal) */}
      <StockTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        type={currentTxType}
        products={products}
        contacts={contacts}
        activeWarehouse={activeWarehouse}
        preselectedProduct={preselectedProdForTx}
        onOpenScanner={() => setIsScannerOpen(true)}
        onSaveTransaction={(txData) => stockStore.createTransaction(txData)}
      />

      {/* 9. Daftar Dokumen Transaksi (Document List Modal) */}
      <DocumentListModal
        isOpen={isDocsListOpen}
        onClose={() => setIsDocsListOpen(false)}
        transactions={transactions}
        activeWarehouse={activeWarehouse}
        onAddNewDocument={() => setIsAddDocSheetOpen(true)}
      />

      {/* 10. AI Voice Note Modal (Special Feature) */}
      <VoiceNoteModal
        isOpen={isVoiceAIOpen}
        onClose={() => setIsVoiceAIOpen(false)}
        knownSkus={products}
        onApplyResult={handleVoiceParseResult}
      />

      {/* 11. Barcode Scanner Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* 12. CRM Kontak Pemasok & Pelanggan */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        contacts={contacts}
        initialType={contactInitialType}
        onAddContact={(c) => stockStore.addContact(c)}
      />

      {/* 13. Biaya Operasional Modal */}
      <ExpensesModal
        isOpen={isExpensesOpen}
        onClose={() => setIsExpensesOpen(false)}
        expenses={expenses}
        activeWarehouse={activeWarehouse}
        onAddExpense={(e) => stockStore.addExpense(e)}
      />

      {/* 14. Laporan & Analitik Modal */}
      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        products={products}
        transactions={transactions}
        expenses={expenses}
        contacts={contacts}
      />

      {/* 15. Pengaturan & Paket Langganan Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        warehouses={warehouses}
        onAddWarehouse={(name, code) => stockStore.addWarehouse(name, code)}
      />
    </div>
  );
}

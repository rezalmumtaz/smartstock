"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  User,
  X,
  Check,
} from "lucide-react";
import { Contact, ContactType } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  initialType?: ContactType;
  onAddContact: (contact: Omit<Contact, "id" | "total_billed" | "total_paid" | "balance_due">) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  initialType = "supplier",
  onAddContact,
}) => {
  const [activeTab, setActiveTab] = useState<ContactType>(initialType);
  const [search, setSearch] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Form Fields (Matching StoDo Screenshot 22.16.58 & 22.16.59)
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [npwp, setNpwp] = useState("");
  const [rekening, setRekening] = useState("");
  const [catatan, setCatatan] = useState("");

  if (!isOpen) return null;

  const currentContacts = contacts.filter(
    (c) =>
      c.type === activeTab &&
      (!search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert("Nama wajib diisi!");
      return;
    }

    onAddContact({
      type: activeTab,
      name: nama.trim(),
      phone: telepon.trim(),
      email: email.trim(),
      address: alamat.trim(),
      npwp: npwp.trim(),
      bank_account: rekening.trim(),
      notes: catatan.trim(),
      price_tier: "retail",
    });

    setNama("");
    setTelepon("");
    setEmail("");
    setAlamat("");
    setNpwp("");
    setRekening("");
    setCatatan("");
    setIsAddFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base text-slate-900">
              {activeTab === "supplier" ? "Pemasok (Suppliers)" : "Pelanggan (Customers)"}
            </h1>
            <div className="text-[11px] text-teal-800 font-semibold">
              Total {currentContacts.length} Kontak
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah {activeTab === "supplier" ? "Pemasok" : "Pelanggan"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center space-x-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab("supplier")}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === "supplier"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Pemasok</span>
        </button>
        <button
          onClick={() => setActiveTab("customer")}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === "customer"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Pelanggan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kontak, nomor telepon, email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-700 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-3">
        {currentContacts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              👥
            </div>
            <div className="font-bold text-slate-700 text-sm">
              Belum ada data {activeTab === "supplier" ? "pemasok" : "pelanggan"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan data kontak untuk mempermudah pencatatan transaksi masuk dan keluar.
            </p>
            <button
              onClick={() => setIsAddFormOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold shadow-md active:scale-95"
            >
              + Tambah Sekarang
            </button>
          </div>
        ) : (
          currentContacts.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-slate-900">{c.name}</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold uppercase">
                    {c.type}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1 text-xs text-slate-500">
                  {c.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-teal-600" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Balance Summary (Matching StoDo Screenshot 22.16.58) */}
              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-xs">
                <div className="text-[10px] text-slate-400">
                  {activeTab === "supplier" ? "Sisa Tagihan / Utang" : "Sisa Piutang"}
                </div>
                <div
                  className={`font-extrabold text-sm ${
                    c.balance_due > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {formatRupiah(c.balance_due)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Ditagih: {formatRupiah(c.total_billed)} • Dibayar: {formatRupiah(c.total_paid)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Contact Modal Form */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Tambahkan {activeTab === "supplier" ? "Pemasok" : "Pelanggan"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nama <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: PT Sumber Makmur"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Telepon</label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="081234567890"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kontak@perusahaan.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Alamat lengkap..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">NPWP</label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    placeholder="Nomor NPWP"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={rekening}
                    onChange={(e) => setRekening(e.target.value)}
                    placeholder="Bank & No Rek"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan</label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold shadow-md"
                >
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

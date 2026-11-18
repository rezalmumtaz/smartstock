"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { IconCheck, IconDownload, IconUpload } from "@/components/icons";
import { Button, Card, cx, Field, PageHeader, Select, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { downloadXlsx, guessMapping, readSpreadsheet, TARGETS, templateFor, type ImportKind, type SheetData } from "@/lib/excel";
import { parseNum, todayISO } from "@/lib/format";
import { errorMessage, supabase } from "@/lib/supabase";

type Step = 0 | 1 | 2 | 3;
interface RowErr { row: number; message: string }
interface Result { created: number; updated: number; skipped: number; errors: RowErr[]; docs: string[] }

const KIND_LABEL: Record<ImportKind, string> = { items: "Barang", stock: "Stok awal & lokasi", contacts: "Kontak" };
const BATCH = 500;

export default function ImporPage() {
  const toast = useToast();
  const { tenant, isOwner, warehouses, warehouseFilter } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [kind, setKind] = useState<ImportKind>("items");
  const [wh, setWh] = useState(warehouseFilter !== "all" ? warehouseFilter : warehouses[0]?.id ?? "");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [updateExisting, setUpdateExisting] = useState(true);
  const [fillBarcode, setFillBarcode] = useState<"none" | "code" | "ean13">("code");
  const [filled, setFilled] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const targets = TARGETS[kind];

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const data = await readSpreadsheet(f);
      if (!data.headers.length || !data.rows.length) { toast("File kosong atau tidak ada baris data", "err"); return; }
      setSheet(data); setFileName(f.name); setMapping(guessMapping(kind, data.headers)); setStep(1);
    } catch (e) {
      toast(errorMessage(e), "err");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Baris siap kirim + error validasi lokal. */
  const prepared = useMemo(() => {
    if (!sheet) return { rows: [] as Record<string, string | number>[], errors: [] as RowErr[] };
    const rows: Record<string, string | number>[] = [];
    const errors: RowErr[] = [];
    sheet.rows.forEach((r, i) => {
      const rowNo = i + 2; // baris 1 = judul kolom
      const obj: Record<string, string | number> = { _row: rowNo };
      for (const t of targets) {
        const idx = mapping[t.key];
        if (idx === null || idx === undefined) continue;
        if (t.ownerOnly && !isOwner) continue;
        const v = r[idx];
        obj[t.key] = v === null || v === undefined ? "" : String(v).trim();
      }
      for (const numKey of ["min_qty", "purchase_price", "sell_price", "qty"]) {
        if (obj[numKey] !== undefined && obj[numKey] !== "") {
          const n = parseNum(obj[numKey]);
          if (n === null) { errors.push({ row: rowNo, message: `${targets.find((t) => t.key === numKey)?.label} "${obj[numKey]}" bukan angka` }); return; }
          obj[numKey] = String(n);
        }
      }
      if (kind === "items" && !obj.name) { errors.push({ row: rowNo, message: "Nama barang kosong" }); return; }
      if (kind === "contacts" && !obj.name) { errors.push({ row: rowNo, message: "Nama kontak kosong" }); return; }
      if (kind === "stock") {
        if (!obj.code && !obj.barcode) { errors.push({ row: rowNo, message: "Kode atau barcode kosong" }); return; }
        if ((obj.qty === undefined || obj.qty === "") && !obj.location) { errors.push({ row: rowNo, message: "Stok dan lokasi kosong" }); return; }
      }
      rows.push(obj);
    });
    if (kind === "items") {
      const seen = new Map<string, number>();
      for (const r of rows) {
        for (const k of ["code", "barcode"]) {
          const v = r[k] ? `${k}:${String(r[k]).toLowerCase()}` : null;
          if (!v) continue;
          if (seen.has(v)) errors.push({ row: Number(r._row), message: `${k === "code" ? "Kode" : "Barcode"} ${r[k]} juga ada di baris ${seen.get(v)}` });
          else seen.set(v, Number(r._row));
        }
      }
    }
    const errRows = new Set(errors.map((e) => e.row));
    return { rows: rows.filter((r) => !errRows.has(Number(r._row))), errors: errors.sort((a, b) => a.row - b.row) };
  }, [sheet, mapping, targets, kind, isOwner]);

  const missingRequired = targets.filter((t) => t.required && (mapping[t.key] === null || mapping[t.key] === undefined));
  const stockNeedsKey = kind === "stock" && ((mapping.code == null && mapping.barcode == null) || (mapping.qty == null && mapping.location == null));

  async function runImport() {
    if (!tenant) return;
    setBusy(true); setProgress(0);
    const sb = supabase();
    const res: Result = { created: 0, updated: 0, skipped: 0, errors: [...prepared.errors], docs: [] };
    try {
      for (let i = 0; i < prepared.rows.length; i += BATCH) {
        const batch = prepared.rows.slice(i, i + BATCH);
        if (kind === "items") {
          const { data, error } = await sb.rpc("import_items", { p_tenant: tenant.id, p_rows: batch, p_update_existing: updateExisting });
          if (error) throw error;
          res.created += data.created; res.updated += data.updated; res.skipped += data.skipped; res.errors.push(...data.errors);
        } else if (kind === "stock") {
          const withQty = batch.filter((r) => r.qty !== undefined && r.qty !== "");
          if (withQty.length) {
            const { data, error } = await sb.rpc("import_opening_stock", { p_warehouse: wh, p_rows: withQty, p_date: todayISO() });
            if (error) throw error;
            res.created += data.lines; res.errors.push(...data.errors);
            if (data.number) res.docs.push(data.number);
          }
          const withLoc = batch.filter((r) => r.location);
          if (withLoc.length) {
            const { data, error } = await sb.rpc("set_item_locations", { p_warehouse: wh, p_rows: withLoc });
            if (error) throw error;
            res.updated += data.updated; res.errors.push(...data.errors);
          }
        } else {
          const rows = batch.map((r) => ({
            tenant_id: tenant.id, name: String(r.name),
            contact_type: /pelanggan|customer|pembeli/i.test(String(r.contact_type ?? "")) ? "customer" : "supplier",
            phone: r.phone ? String(r.phone) : null, email: r.email ? String(r.email) : null,
            address: r.address ? String(r.address) : null, notes: r.notes ? String(r.notes) : null,
          }));
          const { error } = await sb.from("contacts").insert(rows);
          if (error) throw error;
          res.created += rows.length;
        }
        setProgress(Math.min(prepared.rows.length, i + BATCH));
      }
      res.errors.sort((a, b) => a.row - b.row);
      setFilled(0);
      if (kind === "items" && fillBarcode !== "none") {
        const { data, error } = await sb.rpc("fill_missing_barcodes", { p_tenant: tenant.id, p_mode: fillBarcode });
        if (error) toast(`Barcode otomatis gagal: ${errorMessage(error)}`, "err"); else setFilled(Number(data) || 0);
      }
      setResult(res); setStep(3);
    } catch (e) {
      toast(`Impor berhenti: ${errorMessage(e)}`, "err");
      if (res.created || res.updated) { setResult(res); setStep(3); }
    } finally {
      setBusy(false);
    }
  }

  async function downloadErrors(errs: RowErr[]) {
    await downloadXlsx("baris-error-impor.xlsx", [{ name: "Error", columns: [{ header: "Baris di file", key: "row" }, { header: "Masalah", key: "message", width: 60 }], rows: errs.map((e) => ({ row: e.row, message: e.message })) }]);
  }

  async function downloadTemplate() {
    const t = templateFor(kind);
    const cols = isOwner ? t.columns : t.columns.filter((c) => !TARGETS[kind].find((x) => x.key === c.key)?.ownerOnly);
    await downloadXlsx(`template-${KIND_LABEL[kind].toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`, [{ name: KIND_LABEL[kind], columns: cols, rows: t.rows }]);
  }

  function reset() { setStep(0); setSheet(null); setResult(null); setMapping({}); setFileName(""); }

  const steps = ["Unggah", "Cocokkan kolom", "Pratinjau"];

  return (
    <>
      <PageHeader title="Impor dari Excel" back="/barang" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-40 lg:px-6 lg:pb-8">
        <ol className="flex gap-1.5">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col gap-1.5">
              <span className={cx("h-1 rounded-full", i <= Math.min(step, 2) ? "bg-brand" : "bg-line")} />
              <span className={cx("text-[11px] font-bold", i <= Math.min(step, 2) ? "text-brand" : "text-ink-muted")}>{s}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <>
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-bold">Jenis data</h2>
              <div className="flex gap-1.5 rounded-xl2 bg-[#F2F4F7] p-1">
                {(Object.keys(KIND_LABEL) as ImportKind[]).map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={cx("h-10 flex-1 rounded-[10px] text-[13px] font-bold", kind === k ? "bg-white text-ink shadow-sm" : "text-ink-muted")}>{KIND_LABEL[k]}</button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">
                {kind === "items" && <>Kolom: nama, kode, barcode, satuan, grup, stok minimum{isOwner ? ", harga beli, harga jual" : ""}. Barang yang kodenya (atau barcode-nya bila kode kosong) sudah ada bisa diperbarui.{!isOwner ? " Kolom harga diabaikan untuk admin gudang." : ""}</>}
                {kind === "stock" && <>Kolom: kode atau barcode, stok, dan lokasi simpan (opsional, contoh &ldquo;Lt 1 · Rak kanan&rdquo;). Sistem membuat dokumen &ldquo;Saldo awal&rdquo; di gudang terpilih dan langsung memostingnya. Boleh juga hanya kolom lokasi untuk mengisi lokasi saja. Impor barangnya dulu bila belum ada.</>}
                {kind === "contacts" && <>Kolom: nama, jenis (pemasok/pelanggan), telepon, email, alamat, catatan. Jenis kosong dianggap pemasok.</>}
              </p>
              {kind === "stock" ? (
                <Field label="Gudang tujuan stok awal" htmlFor="whs">
                  <Select id="whs" value={wh} onChange={(e) => setWh(e.target.value)}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
                </Field>
              ) : null}
            </Card>
            <label className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[#98A2B3] bg-white px-4 py-8 text-center">
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-soft p-3 text-brand"><IconUpload size={26} /></span>
              <span className="text-[15px] font-bold">Pilih file Excel</span>
              <span className="text-xs text-ink-muted">.xlsx atau .csv · baris pertama berisi judul kolom</span>
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <Card className="flex items-center gap-3">
              <span className="flex flex-1 flex-col"><span className="text-sm font-semibold">Belum punya format?</span><span className="text-xs text-ink-muted">Unduh template {KIND_LABEL[kind].toLowerCase()}, isi, lalu unggah</span></span>
              <button onClick={downloadTemplate} className="flex h-10 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-[13px] font-bold text-brand"><IconDownload size={16} />Template</button>
            </Card>
          </>
        ) : null}

        {step === 1 && sheet ? (
          <>
            <Card className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{fileName}</span>
              <span className="text-xs text-ink-muted">{sheet.sheetName} · {sheet.rows.length} baris · {sheet.headers.length} kolom · {KIND_LABEL[kind]}</span>
            </Card>
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Cocokkan kolom</h2>
                <span className="text-xs font-semibold text-brand">{Object.values(mapping).filter((v) => v !== null && v !== undefined).length} kolom dikenali</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-ink-muted"><span>DATA SMART STOCK</span><span>KOLOM DI FILE</span></div>
              {targets.filter((t) => isOwner || !t.ownerOnly).map((t) => (
                <div key={t.key} className="grid grid-cols-2 items-center gap-2">
                  <label htmlFor={`m-${t.key}`} className="text-sm font-semibold">{t.label}{t.required ? <span className="text-danger"> *</span> : null}</label>
                  <Select id={`m-${t.key}`} value={mapping[t.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [t.key]: e.target.value === "" ? null : Number(e.target.value) }))} className="h-10 text-sm">
                    <option value="">— Lewati —</option>
                    {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
                  </Select>
                </div>
              ))}
              {missingRequired.length || stockNeedsKey ? (
                <p className="rounded-xl2 bg-warn-soft p-2.5 text-xs font-semibold text-warn">
                  {missingRequired.length ? `Wajib dipilih: ${missingRequired.map((t) => t.label).join(", ")}. ` : ""}{stockNeedsKey ? (mapping.code == null && mapping.barcode == null ? "Pilih kolom kode atau barcode. " : "") + (mapping.qty == null && mapping.location == null ? "Pilih kolom stok atau lokasi simpan." : "") : ""}
                </p>
              ) : null}
            </Card>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-xl2 bg-brand-soft p-3"><span className="text-xl font-bold text-brand">{prepared.rows.length}</span><span className="text-xs text-ink-2">baris siap diimpor</span></div>
              <div className="flex flex-col gap-0.5 rounded-xl2 bg-warn-soft p-3"><span className="text-xl font-bold text-warn">{prepared.errors.length}</span><span className="text-xs text-ink-2">perlu dicek (dilewati)</span></div>
            </div>
            {prepared.errors.length ? (
              <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">Baris bermasalah</h2>
                  <button onClick={() => downloadErrors(prepared.errors)} className="h-9 rounded-[10px] border border-line-strong px-2.5 text-xs font-bold text-brand">Unduh daftar error</button>
                </div>
                {prepared.errors.slice(0, 8).map((e, i) => <div key={i} className="flex gap-2.5 text-[13px]"><span className="min-w-[60px] text-ink-muted">Baris {e.row}</span><span>{e.message}</span></div>)}
                {prepared.errors.length > 8 ? <span className="text-xs text-ink-muted">+{prepared.errors.length - 8} lainnya di file error</span> : null}
              </Card>
            ) : null}
            {kind === "items" ? (
              <Card className="flex flex-col gap-2.5">
                <h2 className="text-sm font-bold">Barang yang sudah ada</h2>
                <div className="flex gap-1.5 rounded-xl2 bg-[#F2F4F7] p-1">
                  <button onClick={() => setUpdateExisting(true)} className={cx("h-10 flex-1 rounded-[10px] text-[13px] font-bold", updateExisting ? "bg-white shadow-sm" : "text-ink-muted")}>Perbarui datanya</button>
                  <button onClick={() => setUpdateExisting(false)} className={cx("h-10 flex-1 rounded-[10px] text-[13px] font-bold", !updateExisting ? "bg-white shadow-sm" : "text-ink-muted")}>Lewati</button>
                </div>
                <span className="text-xs text-ink-muted">Dicocokkan berdasarkan kode; barcode dipakai bila kode kosong.</span>
              </Card>
            ) : null}
            {kind === "items" ? (
              <Card className="flex flex-col gap-2.5">
                <h2 className="text-sm font-bold">Barang tanpa barcode</h2>
                <div className="flex flex-col gap-1.5 rounded-xl2 bg-[#F2F4F7] p-1 sm:flex-row">
                  {([["code", "Pakai kode barang"], ["ean13", "Buat EAN-13 otomatis"], ["none", "Biarkan kosong"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setFillBarcode(v)} className={cx("h-10 flex-1 rounded-[10px] text-[13px] font-bold", fillBarcode === v ? "bg-white shadow-sm" : "text-ink-muted")}>{l}</button>
                  ))}
                </div>
                <span className="text-xs text-ink-muted">Supaya semua barang bisa di-scan dan dicetak labelnya. Barcode yang sudah ada tidak diubah.</span>
              </Card>
            ) : null}
            {kind === "stock" ? <Card><p className="text-sm">Stok akan masuk ke <b>{warehouses.find((w) => w.id === wh)?.name}</b> sebagai dokumen Saldo awal bertanggal hari ini.</p></Card> : null}
            {busy ? <p className="text-center text-sm text-ink-muted">Mengimpor {progress} / {prepared.rows.length} baris…</p> : null}
          </>
        ) : null}

        {step === 3 && result ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white"><IconCheck size={30} /></span>
            <h2 className="text-xl font-bold">
              {kind === "stock" ? `${result.created} baris stok masuk${result.updated ? ` · ${result.updated} lokasi disimpan` : ""}` : `${result.created + result.updated} ${kind === "items" ? "barang" : "kontak"} berhasil diimpor`}
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
              {kind === "items" ? `${result.created} dibuat, ${result.updated} diperbarui${result.skipped ? `, ${result.skipped} dilewati` : ""}. ` : ""}
              {kind === "items" && filled ? `${filled} barang diberi barcode otomatis. ` : ""}
              {result.docs.length ? `Dokumen: ${result.docs.join(", ")}. ` : ""}
              {result.errors.length ? `${result.errors.length} baris gagal, unduh daftar error untuk diperbaiki.` : "Tidak ada baris yang gagal."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {result.errors.length ? <Button variant="secondary" onClick={() => downloadErrors(result.errors)}>Unduh daftar error</Button> : null}
              <Link href={kind === "contacts" ? "/pengaturan/kontak" : kind === "stock" ? "/dokumen" : "/barang"} className="flex h-12 items-center rounded-xl2 bg-brand-soft px-5 font-bold text-brand">Lihat hasilnya</Link>
              {kind === "items" ? <Link href="/barang/label" className="flex h-12 items-center rounded-xl2 bg-brand px-5 font-bold text-white">Cetak label barcode</Link> : null}
            </div>
          </div>
        ) : null}
      </div>

      {step > 0 ? (
        <footer className="pb-safe fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white px-4 pt-3 lg:static lg:mx-auto lg:w-full lg:max-w-2xl lg:rounded-2xl lg:border lg:px-6 lg:py-4">
          {step === 1 || step === 2 ? <Button variant="secondary" className="mb-3 lg:mb-0" onClick={() => setStep((s) => (s - 1) as Step)} disabled={busy}>Kembali</Button> : null}
          {step === 1 ? <Button className="mb-3 flex-1 lg:mb-0" disabled={missingRequired.length > 0 || stockNeedsKey} onClick={() => setStep(2)}>Cek data</Button> : null}
          {step === 2 ? <Button className="mb-3 flex-1 lg:mb-0" disabled={prepared.rows.length === 0 || (kind === "stock" && !wh)} loading={busy} onClick={runImport}>Impor {prepared.rows.length} baris</Button> : null}
          {step === 3 ? <Button className="mb-3 flex-1 lg:mb-0" onClick={reset}>Impor file lain</Button> : null}
        </footer>
      ) : null}
    </>
  );
}

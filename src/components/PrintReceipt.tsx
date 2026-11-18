"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPrinter } from "./icons";
import { Button, cx, Sheet, useToast } from "./ui";
import { btConnect, btDeviceName, btPrint, btSupported, lastPrinterName } from "@/lib/btprinter";
import { escpos, layoutText, PAPER_COLS, printHtml, receiptHtml, type Paper, type ReceiptData } from "@/lib/receipt";

const LS = "ss.receipt";
interface Prefs { paper: Paper; extra: boolean }

function loadPrefs(): Prefs {
  try { const p = JSON.parse(localStorage.getItem(LS) ?? "{}"); return { paper: ["58", "80", "a4"].includes(p.paper) ? p.paper : "58", extra: !!p.extra }; }
  catch { return { paper: "58", extra: false }; }
}

const PAPERS: { key: Paper; label: string; hint: string }[] = [
  { key: "58", label: "58 mm", hint: "Thermal kecil" },
  { key: "80", label: "80 mm", hint: "Thermal besar" },
  { key: "a4", label: "A4", hint: "Printer biasa" },
];

/**
 * Lembar cetak bukti: pilih kertas, tambah kolom tanda tangan pihak ketiga,
 * cetak langsung ke printer thermal Bluetooth atau lewat dialog cetak (printer biasa / PDF).
 */
export default function PrintReceipt({ open, onClose, data, extraSign }: { open: boolean; onClose: () => void; data: ReceiptData; extraSign?: string }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>({ paper: "58", extra: false });
  const [busy, setBusy] = useState<"bt" | "pick" | "sys" | null>(null);
  const [printer, setPrinter] = useState<string | null>(null);
  const [bt, setBt] = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); setBt(btSupported()); setPrinter(btDeviceName() ?? lastPrinterName()); }, []);
  const save = (p: Prefs) => { setPrefs(p); try { localStorage.setItem(LS, JSON.stringify(p)); } catch { /* abaikan */ } };

  const final = useMemo<ReceiptData>(() => ({ ...data, signs: prefs.extra && extraSign ? [...data.signs, extraSign] : data.signs }), [data, prefs.extra, extraSign]);
  const thermal = prefs.paper !== "a4";
  const cols = PAPER_COLS[prefs.paper === "80" ? "80" : "58"];
  const preview = useMemo(() => layoutText(final, cols), [final, cols]);

  async function viaBt(pick: boolean) {
    setBusy(pick ? "pick" : "bt");
    try {
      const name = await btConnect(pick);
      setPrinter(name);
      await btPrint(escpos(final, cols));
      toast(`Terkirim ke ${name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/dibatalkan|cancel/i.test(msg)) toast(msg, "err");
    } finally { setBusy(null); }
  }

  async function viaSystem() {
    setBusy("sys");
    try { await printHtml(receiptHtml(final, prefs.paper)); } finally { setBusy(null); }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Cetak bukti">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-ink-3">Ukuran kertas</span>
          <div className="grid grid-cols-3 gap-2">
            {PAPERS.map((p) => (
              <button key={p.key} type="button" onClick={() => save({ ...prefs, paper: p.key })}
                className={cx("flex flex-col items-center rounded-xl2 border px-2 py-2 text-sm", prefs.paper === p.key ? "border-brand bg-brand-soft font-bold text-brand" : "border-line-strong")}>
                {p.label}<span className="text-[11px] font-normal text-ink-muted">{p.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {extraSign ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-brand" checked={prefs.extra} onChange={(e) => save({ ...prefs, extra: e.target.checked })} />
            Tambah tanda tangan <b>{extraSign}</b>
          </label>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-ink-3">Pratinjau</span>
          {thermal ? (
            <div className="overflow-x-auto rounded-xl2 bg-canvas p-3">
              <pre className="mx-auto w-max rounded bg-white px-3 py-4 font-mono text-[10.5px] leading-[1.35] text-black shadow-sm">
                {preview.map((r, i) => <div key={i} className={cx(r.b && "font-bold", r.big && "text-[13px]", r.c && "text-center")}>{r.c ? r.t.trim() || " " : r.t || " "}</div>)}
              </pre>
            </div>
          ) : (
            <p className="rounded-xl2 bg-canvas p-3 text-xs text-ink-3">Format A4 berisi tabel barang (dengan kolom lokasi & cek) dan kolom tanda tangan {final.signs.join(", ")}. Bisa dicetak atau disimpan sebagai PDF dari dialog cetak.</p>
          )}
        </div>

        {thermal && bt ? (
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => viaBt(false)} loading={busy === "bt"} disabled={!!busy}>
              <IconPrinter size={18} />{printer ? `Cetak ke ${printer}` : "Cetak via Bluetooth"}
            </Button>
            {printer ? <button type="button" onClick={() => viaBt(true)} disabled={!!busy} className="text-center text-xs font-semibold text-brand">Ganti printer</button> : null}
          </div>
        ) : null}
        <Button type="button" variant={thermal && bt ? "secondary" : "primary"} onClick={viaSystem} loading={busy === "sys"} disabled={!!busy}>
          {thermal ? "Cetak lewat dialog sistem" : "Cetak / simpan PDF"}
        </Button>

        <p className="text-[11px] leading-relaxed text-ink-muted">
          {thermal ? (bt
            ? "Nyalakan printer & Bluetooth HP. Pertama kali, pilih printer dari daftar (biasanya bernama MPT, RPP, BlueTooth Printer, dsb). Jika printer tidak muncul, printer Anda kemungkinan hanya Bluetooth klasik: pakai tombol dialog sistem bersama aplikasi RawBT."
            : "Cetak langsung via Bluetooth butuh Chrome di Android. Di perangkat ini, pakai dialog sistem (mis. dengan aplikasi printer thermal / RawBT).") : "Pilih printer atau \"Simpan sebagai PDF\" di dialog cetak."}
        </p>
      </div>
    </Sheet>
  );
}

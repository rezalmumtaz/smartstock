// Printer thermal Bluetooth (BLE) lewat Web Bluetooth. Didukung Chrome di Android & desktop, tidak di iPhone.
/* eslint-disable @typescript-eslint/no-explicit-any */

// Layanan BLE yang umum dipakai printer thermal 58/80 mm (harus didaftarkan agar bisa diakses).
const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000ae00-0000-1000-8000-00805f9b34fb",
  "0000ff12-0000-1000-8000-00805f9b34fb",
];

let device: any = null;
let characteristic: any = null;

export function btSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function btDeviceName(): string | null {
  return device?.name ?? null;
}

async function findWritable(server: any): Promise<any> {
  const services: any[] = await server.getPrimaryServices();
  let fallback: any = null;
  for (const s of services) {
    let chars: any[] = [];
    try { chars = await s.getCharacteristics(); } catch { continue; }
    for (const c of chars) {
      if (c.properties.writeWithoutResponse || c.properties.write) {
        if (SERVICES.includes(s.uuid)) return c;
        fallback ??= c;
      }
    }
  }
  return fallback;
}

/** Hubungkan ke printer. pick=true selalu memunculkan daftar perangkat. */
export async function btConnect(pick = false): Promise<string> {
  const bt = (navigator as any).bluetooth;
  if (!bt) throw new Error("Browser ini belum mendukung printer Bluetooth. Pakai Chrome di Android.");
  if (!device || pick) {
    try {
      device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
    } catch (e: any) {
      if (e?.name === "NotFoundError") throw new Error("Tidak ada printer yang dipilih.");
      throw e;
    }
    characteristic = null;
    device.addEventListener?.("gattserverdisconnected", () => { characteristic = null; });
  }
  if (!device.gatt.connected || !characteristic) {
    const server = await device.gatt.connect();
    characteristic = await findWritable(server);
    if (!characteristic) {
      device.gatt.disconnect();
      throw new Error("Perangkat ini bukan printer yang didukung (tidak ada jalur cetak BLE).");
    }
  }
  try { localStorage.setItem("ss.btPrinter", device.name ?? ""); } catch { /* abaikan */ }
  return device.name ?? "Printer";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Kirim data ESC/POS dalam potongan kecil supaya buffer printer tidak meluap. */
export async function btPrint(data: Uint8Array): Promise<void> {
  await btConnect();
  const c = characteristic;
  const chunk = 128;
  for (let i = 0; i < data.length; i += chunk) {
    const part = data.slice(i, i + chunk);
    if (c.properties.write && c.writeValueWithResponse) await c.writeValueWithResponse(part);
    else if (c.writeValueWithoutResponse) { await c.writeValueWithoutResponse(part); await sleep(25); }
    else await c.writeValue(part);
  }
}

export function lastPrinterName(): string | null {
  try { return localStorage.getItem("ss.btPrinter") || null; } catch { return null; }
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw, Zap } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Pindai Barcode / QR Code",
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(() => {});
        setIsScanning(false);
      }
      return;
    }

    setScannerError(null);

    // Dapatkan daftar kamera yang tersedia
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prioritaskan kamera belakang (environment)
          const backCamIndex = devices.findIndex(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("belakang") ||
              d.label.toLowerCase().includes("environment")
          );
          const initialIndex = backCamIndex >= 0 ? backCamIndex : 0;
          setActiveCameraIndex(initialIndex);
          startCamera(devices[initialIndex].id);
        } else {
          setScannerError("Tidak ada kamera yang terdeteksi di perangkat ini.");
        }
      })
      .catch((err) => {
        setScannerError(
          "Izin akses kamera ditolak atau kamera sedang digunakan aplikasi lain."
        );
      });

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  const startCamera = async (cameraId: string) => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode("barcode-scanner-viewfinder", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.33,
        },
        (decodedText) => {
          // Play haptic feedback if available
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(80);
          }
          // Sukses scan
          onScanSuccess(decodedText);
          onClose();
        },
        () => {
          // Ongoing frame without detection (ignore)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      setScannerError(err?.message || "Gagal memulai kamera.");
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (activeCameraIndex + 1) % cameras.length;
    setActiveCameraIndex(nextIndex);
    startCamera(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between">
      {/* Top Header */}
      <div className="px-4 py-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder Center */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-xs aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-blue-500 shadow-2xl">
          <div id="barcode-scanner-viewfinder" className="w-full h-full" />

          {/* Garis Laser Animasi */}
          <div className="absolute left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-scan-laser pointer-events-none" />

          {/* Sudut Viewfinder Estetik */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white pointer-events-none" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white pointer-events-none" />
        </div>

        {scannerError && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-rose-900/80 border border-rose-700 text-rose-200 text-xs text-center max-w-xs">
            {scannerError}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-300 text-center font-medium">
          Arahkan kamera ke Barcode (Code 128 / EAN) atau QR Code barang
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="px-6 py-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around text-white">
        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="flex flex-col items-center space-y-1 text-slate-300 hover:text-white"
          >
            <div className="p-3 rounded-full bg-white/10 hover:bg-white/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Ganti Kamera</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold hover:bg-slate-700"
        >
          Batal
        </button>
      </div>
    </div>
  );
};

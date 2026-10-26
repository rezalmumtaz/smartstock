import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MM Smart Stock — Buku Kartu Stok Kwarto Digital & AI",
  description: "SaaS Manajemen Stok Barang Gudang UMKM Berbasis Event Sourcing & AI Multimodal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-slate-100 text-slate-900 pb-28">
        {children}
      </body>
    </html>
  );
}

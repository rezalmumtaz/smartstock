import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";


export const metadata: Metadata = {
  title: "Smart Stock",
  description: "Stok gudang multi-gudang untuk tim di lapangan",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/mm-favicon.png", apple: "/icons/mm-apple-180.png" },
  appleWebApp: { capable: true, title: "Smart Stock", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0E7C66",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

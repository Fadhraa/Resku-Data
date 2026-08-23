import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReskuData — Pendataan Bencana Terintegrasi Google Spreadsheet (Matim 2026)",
  description:
    "Aplikasi web pendataan cepat bencana alam Kabupaten Manggarai Timur. Pemetaan otomatis dan sinkronisasi 2-sheet Google Spreadsheet (Permukiman, Jiwa, & Fasilitas Umum).",
  keywords: ["ReskuData", "Manggarai Timur", "BPBD", "Tanggap Bencana", "Google Spreadsheet", "Pendataan Korban"],
  authors: [{ name: "Posko Tanggap Bencana Matim 2026" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

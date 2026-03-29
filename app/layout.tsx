import type { Metadata } from "next";
import localFont from "next/font/local";

import { ErpAppShell } from "@/components/erp/erp-app-shell";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EW ERP — Container Sales & Inventory",
  description:
    "Shipping container sales, inventory, and operations in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ErpAppShell>{children}</ErpAppShell>
        <Toaster />
      </body>
    </html>
  );
}

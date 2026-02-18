import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionTimeout from "@/components/SessionTimeout";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ThemeToggle from "@/components/ThemeToggle";
import ForceDesktopViewport from "@/components/ForceDesktopViewport";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Punto de venta CROV | Software POS e inventarios en México",
  description:
    "Plataforma de punto de venta CROV que agiliza ventas, controla inventarios y administra sucursales en México con reportes, usuarios seguros y sincronización.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
        <SessionTimeout />
        <ServiceWorkerRegister />
        <ForceDesktopViewport />
      </body>
    </html>
  );
}

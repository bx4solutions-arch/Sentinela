import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Sentinela · Inteligência de Licitações",
  description:
    "Enquanto o mercado avisa quando o edital sai, o Sentinela mostra meses antes por que vai sair, quem ganhou as últimas vezes e se você tem chance.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sentinela",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sentinela" },
};

export const viewport: Viewport = {
  themeColor: "#0b2d89",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}",
          }}
        />
      </body>
    </html>
  );
}

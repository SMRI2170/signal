import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRuntime } from "@/components/pwa-runtime";

import "./globals.css";

const basePath = process.env.GITHUB_PAGES === "true" ? "/signal" : "";

export const metadata: Metadata = {
  title: "SIGNAL — 事実から、関係性を見る。",
  description: "相手との間で起きた出来事から、関係性の変化を分析する。",
  applicationName: "SIGNAL",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SIGNAL" },
  formatDetection: { telephone: false },
  icons: { icon: `${basePath}/icons/signal-mark.svg`, apple: `${basePath}/icons/signal-mark.svg` },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#a76cff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body><PwaRuntime />{children}</body>
    </html>
  );
}

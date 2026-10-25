import type { Metadata, Viewport } from "next";
import { ActivityStateSync } from "@/components/activity-state-sync";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import travelConfig from "@/travel.config.json";
import "./globals.css";

export const metadata: Metadata = {
  title: travelConfig.appName,
  description: `A personal travel operating system for ${travelConfig.name}.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: travelConfig.appName,
  },
  icons: {
    icon: [
      { url: "/icons/aiwc-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/aiwc-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={travelConfig.language}>
      <body>
        {children}
        <ServiceWorkerRegistration />
        <ActivityStateSync />
      </body>
    </html>
  );
}

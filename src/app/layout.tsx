import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import PerformanceOptimizer from "@/components/PerformanceOptimizer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "Dashdice",
  description: "Who will take the crown? Play PvP dice battles, earn founder rewards, and compete!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dashdice",
    startupImage: [
      {
        url: "/icons/appstore.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  openGraph: {
    title: "Dashdice",
    description: "Who will take the crown? Play PvP dice battles, earn founder rewards, and compete!",
    type: "website",
    siteName: "Dashdice",
    images: [
      {
        url: "/icons/playstore.png",
        width: 512,
        height: 512,
        alt: "Dashdice"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashdice", 
    description: "Who will take the crown? Play PvP dice battles, earn founder rewards, and compete!",
    images: ["/icons/playstore.png"]
  },
  icons: {
    icon: [
      { url: "/icons/android/mipmap-mdpi/appicons.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/android/mipmap-hdpi/appicons.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/android/mipmap-xhdpi/appicons.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/android/mipmap-xxhdpi/appicons.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/android/mipmap-xxxhdpi/appicons.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/icons/appstore.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: "/icons/android/mipmap-xxxhdpi/appicons.png"
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffd700',
  colorScheme: 'dark'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide`}
      >
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
        <PushNotificationSetup />
        <PerformanceOptimizer />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}

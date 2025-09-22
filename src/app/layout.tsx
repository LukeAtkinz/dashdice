import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/context/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashdice",
  description: "Play dice games with friends online",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icons/icon-48.webp", sizes: "48x48", type: "image/webp" },
      { url: "/icons/icon-96.webp", sizes: "96x96", type: "image/webp" },
      { url: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/icon-512.webp", sizes: "512x512", type: "image/webp" }
    ],
    apple: [
      { url: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" }
    ],
    shortcut: "/favicon.ico"
  },
  // PWA manifest (safe addition - doesn't affect existing functionality)
  manifest: "/manifest.json",
  // Mobile app meta tags (safe enhancements)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DashDice",
  },
  applicationName: "DashDice",
  keywords: ["dice", "game", "multiplayer", "online", "friends"],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide overflow-hidden`}
        style={{ height: '100vh', overflow: 'hidden' }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

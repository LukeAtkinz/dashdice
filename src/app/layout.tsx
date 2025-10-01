import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

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
      { url: "/Design Elements/CrownLogo.webp", sizes: "32x32", type: "image/webp" },
      { url: "/Design Elements/CrownLogo.webp", sizes: "any", type: "image/webp" }
    ],
    apple: [
      { url: "/Design Elements/CrownLogo.webp", sizes: "32x32", type: "image/webp" }
    ],
    shortcut: "/Design Elements/CrownLogo.webp"
  },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}

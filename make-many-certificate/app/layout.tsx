import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: "Make My Certificate",
  description:
    "Generate bulk certificates effortlessly. Upload your design and create professional certificates in minutes.",

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    title: "Make My Certificate",
    description:
      "Generate professional certificates in bulk with ease.",
    url: siteUrl,
    siteName: "Make My Certificate",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Make My Certificate",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Make My Certificate",
    description: "Generate professional certificates in bulk with ease.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
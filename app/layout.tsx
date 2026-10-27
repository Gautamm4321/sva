import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://svalabs.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "svā labs — return to self",
  description:
    "svā labs is a sensorial wellness brand: clean, plant-powered remedies made to turn ordinary moments into small rituals of reconnection. Join the waitlist.",
  openGraph: {
    title: "svā labs — return to self",
    description: "Clean, plant-powered rituals for the pauses in your day. Coming soon — join the waitlist.",
    url: "/",
    siteName: "svā labs",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "svā labs — return to self" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#F1ECE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/playfair-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/playfair-display-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}

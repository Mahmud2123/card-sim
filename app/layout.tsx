import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {

  metadataBase: new URL("https://checkgiftcard.org"), 
  
  title: " Card Balance",
  description: "Instantly check the balance of your Apple, Xbox, Razer, and other gift cards.",
  
  openGraph: {
    title: " Card Balance ",
    description: "Instantly check the balance of your Apple, Xbox, Razer, and other gift cards.",
    url: "/",
    siteName: "CardCheck",
    images: [
      {
        // Points directly to the public folder
        url: "/collage.jpg", 
        width: 1200,
        height: 630,
        alt: "Gift Cards Collage",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Gift Card Balance Checker",
    description: "Instantly check the balance of your gift cards.",
    images: ["/collage.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
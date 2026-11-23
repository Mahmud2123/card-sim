import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // IMPORTANT: Replace this with your actual live domain (e.g., 'https://your-app.vercel.app')
  // Next.js requires this to format absolute URLs for images.
  metadataBase: new URL("https://checkgiftcard.org"), 
  
  title: "Gift Card Balance Checker",
  description: "Instantly check the balance of your Apple, Xbox, Razer, and other gift cards.",
  
  // Open Graph is used by WhatsApp, iMessage, Facebook, Discord, etc.
  openGraph: {
    title: " Card Balance ",
    description: "Instantly check the balance of your Apple, Xbox, Razer, and other gift cards.",
    url: "/",
    siteName: "CardCheck",
    images: [
      {
        // Primary image shown in WhatsApp
        url: "https://th.bing.com/th/id/OIP.iOsstowz9WFTgzjw58RE-wHaEs?w=297&h=187&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3", 
        width: 800,
        height: 600,
        alt: "Apple Gift Card",
      },
      {
        // Secondary image (some platforms allow swiping)
        url: "https://d3m9l0v76dty0.cloudfront.net/system/photos/1069939/original/2d4c06bf179d3a785d2db850402bd85c.png",
        width: 800,
        height: 600,
        alt: "Xbox Gift Card",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter/X specific metadata
  twitter: {
    card: "summary_large_image",
    title: " Card Balance ",
    description: "Instantly check the balance of your gift cards.",
    images: ["https://th.bing.com/th/id/OIP.iOsstowz9WFTgzjw58RE-wHaEs?w=297&h=187&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3"],
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
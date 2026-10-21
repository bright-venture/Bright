import type { Metadata } from "next";
import { NavTracker } from "@/components/back-button";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bright Portal", template: "%s | Bright Portal" },
  description: "Employee portal for Bright Service Company SARL.",
  // The whole portal is private: never index any page.
  robots: { index: false, follow: false },
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><NavTracker />{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%23d06a3a'/%3E%3C/svg%3E" },
  title: "Anatolia atlas",
  description: "Published places on a terrain model of Turkey. Not a discovery map.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obavia",
  description: "Tell Obavia your credit, your down payment, and the car you want. Honest numbers before you walk onto a lot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

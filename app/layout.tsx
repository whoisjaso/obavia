import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obavia",
  description: "What can I actually get? Honest car numbers before you walk onto a lot.",
  applicationName: "Obavia",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Obavia" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport = { themeColor: "#0a84ff", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

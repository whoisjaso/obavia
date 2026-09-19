import type { MetadataRoute } from "next";

// Installable web app (constitution #8: no install required; offered, never forced).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Obavia",
    short_name: "Obavia",
    description: "What can I actually get? Honest car numbers before you walk onto a lot.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#0a84ff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

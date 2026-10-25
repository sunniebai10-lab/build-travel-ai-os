import type { MetadataRoute } from "next";
import travelConfig from "@/travel.config.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: travelConfig.appName,
    short_name: travelConfig.appName.slice(0, 20),
    description: "A personal travel operating system for understanding and remembering the world.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#f8f5ef",
    background_color: "#f8f5ef",
    icons: [
      {
        src: "/icons/aiwc-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/aiwc-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

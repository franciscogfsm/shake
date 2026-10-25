import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHAKE: the safe way to pay a stranger",
    short_name: "SHAKE",
    description: "Money only releases when you meet face to face.",
    start_url: "/try",
    display: "standalone",
    background_color: "#0d0f12",
    theme_color: "#0d0f12",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blynk",
    short_name: "Blynk",
    description: "Real connections with control over your profile and privacy.",
    start_url: "/",
    display: "standalone",
    background_color: "#090914",
    theme_color: "#f13ab5",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

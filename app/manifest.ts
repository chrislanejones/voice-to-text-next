import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Voice to Text",
    short_name: "Voice to Text",
    description: "Speak, pin your notes, and listen to articles.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#f3f2f2",
    icons: [{ src: "/icons/reader.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}

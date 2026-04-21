import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FaisTonPlein",
    short_name: "FaisTonPlein",
    description:
      "Trouvez la station-service la moins chère près de chez vous. Comparez les prix des carburants en France.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f39f6",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

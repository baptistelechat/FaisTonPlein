import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les .woff de l'og:image sont lus au runtime avec fs.readFile : le tracing
  // automatique ne les détecte pas, il faut les inclure explicitement dans le
  // bundle serverless sinon la génération d'image échoue en production.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/_og-fonts/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            // credentialless (pas require-corp) : garde SharedArrayBuffer pour DuckDB-WASM
            // sans bloquer les requêtes cross-origin no-cors vers PostHog (qui n'envoie pas
            // de header Cross-Origin-Resource-Policy — require-corp les bloquait silencieusement)
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

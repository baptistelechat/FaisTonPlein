/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import path from "node:path";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Le preview de Claude attribue un port libre via PORT (plusieurs sessions en parallèle).
if (process.env.PORT) {
  Config.setStudioPort(Number(process.env.PORT));
}

// Même alias que l'app : la vidéo réutilise src/lib (prix nationaux, coût réel)
// au lieu d'en recopier la logique.
Config.overrideRspackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      "@": path.join(process.cwd(), "..", "src"),
    },
  },
}));

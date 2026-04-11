module.exports = {
  apps: [
    {
      name: "fais-ton-plein_etl",
      script: "./dist/index.js", // Use compiled JS
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
    },
  ],
};

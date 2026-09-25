import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const manualChunks = (id) => {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("@microsoft/signalr")) return "signalr-vendor";
  if (id.includes("react-i18next") || id.includes("i18next")) return "i18n-vendor";
  if (id.includes("react-router")) return "router-vendor";
  if (id.includes("react-dom") || /node_modules[\/]react[\/]/.test(id)) return "react-vendor";
  return "vendor";
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:7169",
        changeOrigin: true,
        secure: false,
      },
      "/hubs": {
        target: "https://localhost:7169",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const manualChunks = (id) => {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
    return "charts-vendor";
  }
  if (id.includes("react-grid-layout") || id.includes("react-resizable")) {
    return "grid-vendor";
  }
  if (id.includes("lucide-react")) return "icons-vendor";
  if (id.includes("react-router")) return "router-vendor";
  if (id.includes("react-dom") || /node_modules[\/]react[\/]/.test(id)) return "react-vendor";
  return "vendor";
};

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
    host: "localhost",
    port: 5174,
    strictPort: true,

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

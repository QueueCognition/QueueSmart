import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(
                id,
              )
            ) {
              return "react";
            }
            if (
              /[\\/]node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/.test(
                id,
              )
            ) {
              return "forms";
            }
            if (/[\\/]node_modules[\\/](@tanstack|ky)[\\/]/.test(id)) {
              return "data";
            }
            if (/[\\/]node_modules[\\/](@headlessui|date-fns)[\\/]/.test(id)) {
              return "ui";
            }
            return "vendor";
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  };
});

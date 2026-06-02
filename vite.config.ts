import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/ 
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:1000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "src/main.tsx",
        "src/tests/**",
        "src/**/__mocks__/**",
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.message?.includes("Use of eval") &&
          String(warning.id ?? "").includes("@react-jvectormap")
        ) {
          return;
        }
        warn(warning);
      },
      // SE ELIMINÓ manualChunks PARA EVITAR CONFLICTOS DE CARGA DE REACT Y APEXCHARTS
    },
  },
});
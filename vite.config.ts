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
        // This will transform your SVG to a React component
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
      // Umbrales opcionales: descomenta y ajusta cuando quieras fallar el CI por cobertura baja
      // thresholds: { lines: 10, functions: 10, branches: 10, statements: 10 },
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
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("@react-jvectormap") ||
            id.includes("jvectormap")
          ) {
            return "jvectormap";
          }
          if (
            id.includes("apexcharts") ||
            id.includes("react-apexcharts")
          ) {
            return "apexcharts";
          }
          if (id.includes("@fullcalendar")) {
            return "fullcalendar";
          }
          if (id.includes("swiper")) {
            return "swiper";
          }
          if (
            id.includes("react-dom") ||
            id.includes("/react/jsx-runtime") ||
            id.includes("/react/index.js") ||
            id.includes("\\react\\index.js")
          ) {
            return "react-core";
          }
          if (id.includes("react-router")) {
            return "react-router";
          }
        },
      },
    },
  },
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Raise warning ceiling — we intentionally keep some heavy route chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // React core — loaded on every page, keep tiny and shared
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          // Router
          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "vendor-router";
          }
          // Supabase client — used by every page that fetches data
          if (id.includes("@supabase/")) {
            return "vendor-supabase";
          }
          // TanStack Query
          if (id.includes("@tanstack/")) {
            return "vendor-query";
          }
          // Radix UI primitives — large, used across many pages
          if (id.includes("@radix-ui/")) {
            return "vendor-radix";
          }
          // Charting — heavy, only used in analytics/dashboards
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          // Date utils — used across many pages
          if (id.includes("date-fns")) {
            return "vendor-date";
          }
          // Icons
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          // Form stack
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "vendor-forms";
          }
          // Everything else from node_modules
          return "vendor-misc";
        },
      },
    },
  },
}));

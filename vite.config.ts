import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  build: {
    // Split into many small chunks instead of 1 giant file
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — loaded first, cached permanently
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // Supabase client — separate chunk, cached after first load
          "vendor-supabase": ["@supabase/supabase-js"],

          // UI library — large but static, cached permanently
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-accordion",
            "@radix-ui/react-slider",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],

          // Charts — only loaded when analytics/charts are opened
          "vendor-charts": ["recharts"],

          // Form handling — separate chunk
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],

          // Date utilities
          "vendor-dates": ["date-fns"],

          // TanStack Query — data fetching
          "vendor-query": ["@tanstack/react-query"],

          // Icons — large library, cache permanently
          "vendor-icons": ["lucide-react"],
        },
      },
    },

    // Increase chunk size warning threshold (our chunks are intentionally larger)
    chunkSizeWarningLimit: 1000,

    // Enable source maps only in development
    sourcemap: mode === "development",

    // Minify for production
    minify: "esbuild",

    // Target modern browsers only (hospitals use Chrome/Edge)
    target: "es2020",
  },
}));

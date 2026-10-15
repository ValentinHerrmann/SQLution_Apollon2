import { defineConfig } from "vite"

// SQLution serves this bundle from Django's static files (e.g.
// /static/apollon/), not from a site root. A relative base makes every lazy
// chunk, the edge-routing worker and the resvg wasm resolve next to the entry
// script, and the fixed entry names keep the Django template stable across
// rebuilds.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    // The lazy /export chunk (PNG/PDF renderers) is large by design.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: "src/index.ts",
      // Base UI ships "use client" directives for React Server Components;
      // they are meaningless in this client-only bundle.
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return
        warn(warning)
      },
      output: {
        entryFileNames: "apollon-sqlution.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith(".css"))
            ? "apollon-sqlution.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom", "yjs"],
  },
})

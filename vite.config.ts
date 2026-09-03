import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // MPA so missing paths 404 (via public/404.html on Pages) instead of SPA-rewriting to index.html.
  appType: "mpa",
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});

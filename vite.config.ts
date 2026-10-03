import { defineConfig } from "vite";
export default defineConfig({
  css: { postcss: { plugins: [] } },
  build: { outDir: "dist", commonjsOptions: { strictRequires: true } },
});

import { defineConfig, lazyPlugins } from "vite-plus";
import { patchsmith } from "patchsmith/vite";

export default defineConfig({
  plugins: lazyPlugins(() => [patchsmith()]),
  lint: {
    ignorePatterns: ["patchsmith.gen.ts", "patchsmith.functions.gen.ts", ".patchsmith/**"],
  },
  fmt: {
    ignorePatterns: ["patchsmith.gen.ts", "patchsmith.functions.gen.ts", ".patchsmith/**"],
  },
});

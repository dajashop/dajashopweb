import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import ssrDev from './scripts/ssr-dev.mjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ssrDev()],
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import ssrDev from './scripts/ssr-dev.mjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ssrDev()],
  server: {
    host: '127.0.0.1',
    fs: { deny: ['.env', '.env.*', '.dev.vars', '.dev.vars.*', '**/.git/**', '**/*.{pem,key,p12,pfx}'] },
  },
  preview: { host: '127.0.0.1' },
  build: { sourcemap: false },
});

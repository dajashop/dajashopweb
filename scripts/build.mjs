import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';

// Pages deploys the browser assets and the bundled advanced-mode Worker
// together. No Node.js runtime or external npm imports are needed at the edge.
await build();
await build({
  configFile: false,
  plugins: [react()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  ssr: { target: 'webworker', noExternal: true },
  build: {
    ssr: 'src/ssr/worker.js',
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      output: { entryFileNames: '_worker.js', inlineDynamicImports: true },
    },
  },
});
const template = await readFile('dist/index.html', 'utf8');
if (!template.includes('<div id="root"></div>')) {
  throw new Error('SSR template is missing the React root placeholder.');
}

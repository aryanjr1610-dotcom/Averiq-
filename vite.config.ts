import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'next/link': fileURLToPath(new URL('./src/lib/next-compat/link.tsx', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./src/lib/next-compat/navigation.ts', import.meta.url)),
    },
  },

  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep shared app dependencies out of deferred feature chunks.
        onlyExplicitManualChunks: true,
        manualChunks: (id: string) => {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/katex')) return 'katex';
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
          return undefined;
        },
      },
    },
  },
});

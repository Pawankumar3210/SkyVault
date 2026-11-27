import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@dnd-kit/')) return 'dnd';
          if (id.includes('/@hookform/') || id.includes('/react-hook-form/') || id.includes('/zod/')) return 'forms';
          if (id.includes('/@radix-ui/')) return 'radix';
          if (id.includes('/date-fns/')) return 'dates';
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion';
          if (id.includes('/idb/')) return 'idb';
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/recharts/')) return 'charts';
          if (id.includes('/d3-') || id.includes('/victory-vendor/') || id.includes('/internmap/')) return 'chart-vendor';
          if (id.includes('/@remix-run/') || id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-is/') || id.includes('/react-router') || id.includes('/scheduler/')) return 'react';
        },
      },
    },
  },
});

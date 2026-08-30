import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    port: 7000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7100',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:7100',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui';
            }
            if (id.includes('axios') || id.includes('zustand') || id.includes('@tanstack/react-query') || id.includes('i18next')) {
              return 'utils';
            }
          }
        }
      }
    }
  },
});

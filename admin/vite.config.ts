import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://45.144.136.37:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://45.144.136.37:3000',
        changeOrigin: true,
      },
    },
  },
}); 
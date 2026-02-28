import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_REVOLUT_ENV': JSON.stringify(env.REVOLUT_ENV || 'sandbox'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor: React core (shared by all routes)
            'vendor-react': ['react', 'react-dom'],
            // Revolut: only loaded when payments are needed
            'vendor-revolut': ['@revolut/checkout'],
          },
        },
      },
      // Suppress the chunk size warning (expected after splitting)
      chunkSizeWarningLimit: 400,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        // Ignore db.json to prevent Vite from reloading on every API write
        ignored: ['**/db.json'],
      },
    },
  };
});

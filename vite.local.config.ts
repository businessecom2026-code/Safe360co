/**
 * vite.local.config.ts — build config for local preview WITHOUT @tailwindcss/vite
 *
 * @tailwindcss/vite requires the @tailwindcss/oxide native binary which is
 * blocked by Windows Application Control policy on this machine.
 *
 * This config replaces the Tailwind Vite plugin with:
 *  1. A CSS transform that strips the @import "tailwindcss" directive
 *  2. An HTML transform that injects Tailwind CDN for styling
 *
 * Usage:  npx vite build --config vite.local.config.ts
 * Output: dist/ — fully functional app with Tailwind via CDN
 */

import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

function tailwindCdnPlugin(): Plugin {
  return {
    name: 'tailwind-cdn',

    // Strip native Tailwind v4 directives from CSS (they can't be processed without the binary)
    transform(code, id) {
      if (id.endsWith('index.css') || id.includes('index.css?')) {
        return code
          .replace(/@import\s+["']tailwindcss["'];?\s*/g, '')
          .replace(/@theme\s*\{[^}]*\}/gs, '')
          .replace(/@custom-variant[^\n]*/g, '');
      }
    },

    // Inject Tailwind CDN + Inter font into <head> so styles render correctly
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        [
          '  <!-- Tailwind CDN (local preview only — production uses compiled CSS) -->',
          '  <script src="https://cdn.tailwindcss.com"></script>',
          '</head>',
        ].join('\n')
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindCdnPlugin()],
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
            'vendor-react': ['react', 'react-dom'],
            'vendor-revolut': ['@revolut/checkout'],
          },
        },
      },
      chunkSizeWarningLimit: 400,
    },
  };
});

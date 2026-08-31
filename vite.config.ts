import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        devOptions: { enabled: false },
        includeAssets: [
          'favicon.png',
          'icons/apple-touch-icon.png',
          'brand/studyfactory-character.png',
        ],
        manifest: {
          background_color: '#f7f6ee',
          description: '스터디팩토리 회원 관리 앱',
          display: 'standalone',
          icons: [
            {
              sizes: '192x192',
              src: '/icons/icon-192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: '/icons/icon-512.png',
              type: 'image/png',
            },
            {
              purpose: 'maskable',
              sizes: '512x512',
              src: '/icons/icon-maskable-512.png',
              type: 'image/png',
            },
          ],
          id: '/',
          lang: 'ko',
          name: '스터디팩토리',
          orientation: 'portrait',
          scope: '/',
          short_name: '스터디팩토리',
          start_url: '/',
          theme_color: '#1e3d32',
        },
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              handler: 'NetworkOnly',
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            },
          ],
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          changeOrigin: true,
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        },
      },
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Configuration Vite — site public + back office React (frontend/).
// L'API Laravel (backend/) est atteinte via le proxy /api → port 8000 :
// aucun réglage CORS nécessaire en développement.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // HMR désactivable (DISABLE_HMR=true) pour les aperçus proxifiés.
    hmr: process.env.DISABLE_HMR !== 'true',
    host: '0.0.0.0',
    // Autorise les aperçus proxifiés (sandbox / preview) en plus de localhost.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Fichiers déposés par les vendeurs (photos, documents) servis par
      // Laravel via le lien public/storage (php artisan storage:link).
      '/storage': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});

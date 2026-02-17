import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The IDS BK endpoint does not set CORS headers, so we proxy
// all /api/* requests through Vite's dev server to bypass the
// browser's same-origin restriction.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://mapa.idsbk.sk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osrm/, ''),
        secure: true,
      },
    },
  },
});

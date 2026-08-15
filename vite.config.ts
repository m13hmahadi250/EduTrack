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
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'motion'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'react-router', 'motion/react', 'zustand', 'leaflet', 'lucide-react'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 1. Core Framework Runtime (lightweight, highly cacheable)
              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('react-router') ||
                id.includes('zustand')
              ) {
                return 'core-framework';
              }

              // 2. Heavy Visualization & Mapping
              if (id.includes('leaflet') || id.includes('leaflet-routing-machine') || id.includes('leaflet.markercluster') || id.includes('react-leaflet')) {
                return 'leaflet-vendor';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }

              // 3. Heavy PDF Engine (downloaded only on export clicks)
              if (id.includes('jspdf') || id.includes('canvg') || id.includes('html2canvas') || id.includes('fflate')) {
                return 'jspdf-vendor';
              }

              // 4. Firebase SDKs
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-vendor';
              }

              // 5. Animations & Confetti
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'motion-vendor';
              }
              if (id.includes('canvas-confetti')) {
                return 'confetti-vendor';
              }

              // 6. UI Icons
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }

              return 'vendor';
            }

            // Code-split heavy admin sub-modules
            if (id.includes('/src/components/admin/')) {
              return 'admin-components';
            }
          },
        },
      },
    },
  };
});

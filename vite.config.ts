import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
        'react-router-dom',
        'zustand',
        'lucide-react',
        'motion/react',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Heavy isolated libraries
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-vendor';
              }
              if (id.includes('leaflet')) {
                return 'leaflet-vendor';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }
              if (id.includes('jspdf') || id.includes('canvg') || id.includes('html2canvas') || id.includes('fflate')) {
                return 'jspdf-vendor';
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

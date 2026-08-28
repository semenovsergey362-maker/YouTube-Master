import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Try to load from /app/.dev.env.json if GEMINI_API_KEY is empty or placeholder
  let geminiApiKey = env.GEMINI_API_KEY || '';
  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
    try {
      const devEnvPath = '/app/.dev.env.json';
      if (fs.existsSync(devEnvPath)) {
        const devEnv = JSON.parse(fs.readFileSync(devEnvPath, 'utf-8'));
        if (devEnv.GEMINI_API_KEY) {
          geminiApiKey = devEnv.GEMINI_API_KEY;
        }
      }
    } catch (e) {
      console.error('Error reading /app/.dev.env.json in vite.config.ts:', e);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/') || id.includes('/node_modules/motion/')) {
                return 'vendor-react';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('@google/genai') || id.includes('googleapis') || id.includes('gtoken')) {
                return 'vendor-google';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('jszip') || id.includes('html-to-image') || id.includes('html2pdf') || id.includes('diff') || id.includes('file-saver')) {
                return 'vendor-utils';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : true,
    },
  };
});

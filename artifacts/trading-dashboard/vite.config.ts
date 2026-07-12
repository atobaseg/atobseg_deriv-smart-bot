import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Only require PORT for local dev; default to 3000 for production builds
const port = Number(process.env.PORT || 3000);

export default defineConfig({
  // Use '/' as the default base for production to fix asset pathing
  base: process.env.NODE_ENV === 'production' ? '/' : (process.env.BASE_PATH || '/'),
  
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? [
          import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, '..') }),
          ),
          import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // Build directly into 'dist' so Render sees index.html at the root
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disabling as per your previous error logs
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
  },
});
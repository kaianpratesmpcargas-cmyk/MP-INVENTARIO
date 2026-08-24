import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-is', 'recharts', 'qrcode', 'jsbarcode', 'jspdf', 'html2canvas', 'html5-qrcode', 'lucide-react'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { viteProxyConfig } from './electron/proxyRoutes.js';

// Proxy local: o navegador não pode chamar Yahoo, AwesomeAPI e Banco Central direto (bloqueio de CORS).
// O app chama /api/... e o Vite repassa a chamada. Só o ticker / código da série sai do computador.
// As rotas ficam em electron/proxyRoutes.js, compartilhadas com o app desktop (Electron).
const proxy = viteProxyConfig();

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // host 127.0.0.1: o app só é acessível neste computador, não na rede.
  server: { host: '127.0.0.1', port: 5173, proxy },
  preview: { host: '127.0.0.1', port: 4173, proxy },
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.js', 'electron/**/*.test.js'] }
});

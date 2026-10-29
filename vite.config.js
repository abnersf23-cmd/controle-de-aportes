import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Proxy local: o navegador não pode chamar o Yahoo Finance direto (bloqueio de CORS).
// O app chama /api/yahoo/... e o Vite repassa a chamada. Só o ticker sai do computador.
const proxy = {
  '/api/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/yahoo/, ''),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }
  },
  '/api/dolar': {
    target: 'https://economia.awesomeapi.com.br',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/dolar/, '/json/last/USD-BRL')
  },
  // Selic, CDI e IPCA: API pública do Banco Central (SGS). Só o código da série sai do computador.
  '/api/bcb': {
    target: 'https://api.bcb.gov.br',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/bcb/, '/dados/serie')
  }
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // host 127.0.0.1: o app só é acessível neste computador, não na rede.
  server: { host: '127.0.0.1', port: 5173, proxy },
  preview: { host: '127.0.0.1', port: 4173, proxy },
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.js'] }
});

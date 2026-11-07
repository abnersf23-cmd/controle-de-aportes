// Regras de segurança da janela do app desktop, separadas do main.js para poderem ser testadas.

// Política de segurança de conteúdo (CSP): diz ao Chromium o que a página pode carregar.
// Se um dia um texto malicioso conseguir virar código na tela (XSS), o navegador recusa
// rodar scripts de fora, enviar dados para outros sites ou abrir a página dentro de outra.
//  - script-src 'self': só os arquivos .js do próprio app (nenhum script inline ou de outro site);
//  - connect-src 'self': fetch só para app://controle-aportes (a internet passa pelo proxy do main.js);
//  - style-src 'unsafe-inline': necessário para os gráficos (Recharts) e o React, que usam style="".
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'"
].join('; ');

// Permissões do Chromium que o app realmente usa. Todo o resto (câmera, microfone,
// localização, notificações, ler a área de transferência...) é negado, mesmo para o app.
export const ALLOWED_PERMISSIONS = new Set(['fileSystem', 'persistent-storage', 'clipboard-sanitized-write', 'fullscreen']);

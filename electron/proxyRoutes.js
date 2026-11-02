// Rotas de internet que o app usa (cotações e taxas), num lugar só.
//
// Por que existe: o navegador não pode chamar Yahoo, AwesomeAPI e Banco Central direto
// (bloqueio de CORS). Então o app sempre chama um caminho local, como /api/bcb/..., e
// alguém "do lado do computador" repassa a chamada:
//   - no modo web (npm run dev), quem repassa é o proxy do Vite (vite.config.js);
//   - no app desktop, quem repassa é o processo principal do Electron (electron/main.js).
// Os dois leem esta mesma lista, então uma rota nova só precisa ser escrita aqui.
//
// Segurança: só estes três destinos são aceitos. Qualquer outro caminho é recusado.

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export const PROXY_ROUTES = [
  // Cotações de ações e FIIs. Só o ticker sai do computador.
  { prefix: '/api/yahoo', target: 'https://query1.finance.yahoo.com', rewrite: '', headers: { 'User-Agent': BROWSER_UA } },
  // Dólar comercial.
  { prefix: '/api/dolar', target: 'https://economia.awesomeapi.com.br', rewrite: '/json/last/USD-BRL' },
  // Selic, CDI e IPCA: API pública do Banco Central (SGS). Só o código da série sai do computador.
  { prefix: '/api/bcb', target: 'https://api.bcb.gov.br', rewrite: '/dados/serie' }
];

// Converte "/api/bcb/bcdata.sgs.432/dados/ultimos/1?formato=json" na URL de verdade.
// Retorna null se o caminho não for de uma rota conhecida (aí ninguém repassa nada).
export function resolveProxyUrl(pathWithQuery) {
  const path = String(pathWithQuery || '');
  for (const route of PROXY_ROUTES) {
    // "/api/bcbX" não pode casar com "/api/bcb": depois do prefixo tem que vir /, ? ou nada.
    if (path !== route.prefix && !path.startsWith(route.prefix + '/') && !path.startsWith(route.prefix + '?')) continue;
    const rest = path.slice(route.prefix.length);
    const url = new URL(route.rewrite + rest, route.target);
    // Garante que a URL final continua no mesmo site (nada de "//outro-site.com" no caminho).
    if (url.origin !== new URL(route.target).origin) return null;
    return { url: url.toString(), headers: route.headers || {} };
  }
  return null;
}

// Formato que o Vite espera em server.proxy (usado no vite.config.js).
export function viteProxyConfig() {
  return Object.fromEntries(
    PROXY_ROUTES.map(r => [
      r.prefix,
      {
        target: r.target,
        changeOrigin: true,
        rewrite: path => r.rewrite + path.slice(r.prefix.length),
        ...(r.headers ? { headers: r.headers } : {})
      }
    ])
  );
}

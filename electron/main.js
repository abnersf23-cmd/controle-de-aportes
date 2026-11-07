// Processo principal do app desktop (Electron).
//
// Como o app desktop funciona, em 3 ideias:
// 1. A janela é um Chromium que abre o mesmo app React do modo web (a pasta dist/,
//    gerada pelo "vite build"). Nada da interface muda.
// 2. Em vez de abrir os arquivos como file://, o app usa um endereço próprio,
//    app://controle-aportes/. Isso dá ao app uma "origem" fixa: o IndexedDB (onde ficam
//    seus dados) fica sempre no mesmo lugar e o app roda como site seguro (https-like).
// 3. Quando o app pede /api/bcb/..., /api/yahoo/... ou /api/dolar, quem busca na internet
//    é ESTE processo (Node.js, sem bloqueio de CORS), usando a mesma lista de rotas do
//    proxy do Vite (electron/proxyRoutes.js). A página nunca ganha acesso ao Node.
//
// Segurança: contextIsolation + sandbox ligados, nodeIntegration desligado, sem preload
// (a página não recebe nenhuma função extra), links externos abrem no navegador padrão,
// só três destinos de internet são aceitos, a página tem uma CSP (electron/security.js)
// e só recebe as permissões da lista. O executável também vem "travado" pelos fuses
// (package.json > build > electronFuses).
import { app, BrowserWindow, Menu, net, protocol, session, shell } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProxyUrl } from './proxyRoutes.js';
import { ALLOWED_PERMISSIONS, CSP } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const SCHEME = 'app';
const HOST = 'controle-aportes';
const ORIGIN = `${SCHEME}://${HOST}`;
const PROXY_TIMEOUT_MS = 15000;
// Resposta da internet maior que isso é recusada (uma cotação tem poucos KB).
const PROXY_MAX_BYTES = 5 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8'
};

// Precisa ser chamado antes do app ficar pronto. "standard" + "secure" fazem o
// app:// se comportar como um site https (IndexedDB, fetch, File System Access).
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const text = (status, body) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// Repassa /api/... para a internet (o mesmo papel do proxy do Vite no modo web).
async function proxy(request, url) {
  if (request.method !== 'GET') return text(405, 'Método não permitido');
  const target = resolveProxyUrl(url.pathname + url.search);
  if (!target) return text(404, 'Rota desconhecida');
  try {
    const res = await net.fetch(target.url, {
      headers: { Accept: 'application/json', ...target.headers },
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS)
    });
    const body = await res.arrayBuffer();
    if (body.byteLength > PROXY_MAX_BYTES) return text(502, 'Resposta grande demais');
    return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e) {
    // Sem internet ou site fora do ar: o app trata o erro e mantém o último valor salvo.
    return text(502, `Falha ao buscar: ${e?.message || e}`);
  }
}

// Entrega um arquivo de dist/. Caminho desconhecido cai no index.html.
async function serveFile(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return text(400, 'Caminho inválido');
  }
  const file = path.normalize(path.join(DIST, rel));
  // Impede "../" de sair da pasta dist/.
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return text(403, 'Proibido');
  const isFile = await stat(file).then(
    s => s.isFile(),
    () => false
  );
  const target = isFile ? file : path.join(DIST, 'index.html');
  try {
    const body = await readFile(target);
    const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' };
    if (type.startsWith('text/html')) headers['Content-Security-Policy'] = CSP;
    return new Response(body, { status: 200, headers });
  } catch {
    return text(404, 'Arquivo não encontrado. Rode "npm run build" antes de abrir o app desktop.');
  }
}

function handleAppProtocol(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return text(404, 'Não encontrado');
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxy(request, url);
  return serveFile(url.pathname);
}

const isOwnUrl = url => {
  if (url === ORIGIN || url.startsWith(ORIGIN + '/')) return true;
  // Em desenvolvimento (ELECTRON_DEV_URL), o servidor do Vite também conta como "o app".
  const devUrl = !app.isPackaged && process.env.ELECTRON_DEV_URL;
  return Boolean(devUrl) && url.startsWith(new URL(devUrl).origin);
};

function openExternal(url) {
  // Só links https vão para o navegador padrão; o resto é ignorado.
  if (/^https:\/\//i.test(url)) shell.openExternal(url);
}

function buildMenu() {
  const template = [
    { label: 'Arquivo', submenu: [{ role: 'quit', label: 'Sair' }] },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho normal' },
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Diminuir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        // Ferramentas do desenvolvedor só aparecem fora do instalador.
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Ferramentas do desenvolvedor' }])
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Controle de Aportes',
    backgroundColor: '#090c14', // mesma cor do tema escuro: evita o "flash" branco ao abrir
    autoHideMenuBar: true, // a barra de menu aparece ao apertar Alt
    // No Windows o ícone vem do próprio .exe; este é só para rodar em desenvolvimento.
    ...(app.isPackaged ? {} : { icon: path.join(__dirname, '..', 'build', 'icon.png') }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Links com target="_blank" ou window.open: abre no navegador, nunca numa janela nova do app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  // A janela nunca sai do app:// (um link clicado por engano abre no navegador).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isOwnUrl(url)) return;
    event.preventDefault();
    openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ELECTRON_DEV_URL permite abrir o servidor do Vite (npm run dev) dentro da janela.
  // Atenção: nesse modo o IndexedDB é outro (a origem muda), então os dados não são os mesmos.
  const devUrl = !app.isPackaged && process.env.ELECTRON_DEV_URL;
  mainWindow.loadURL(devUrl || `${ORIGIN}/`);
}

// Só uma janela do app por vez: abrir de novo traz a janela existente para frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('br.abner.controle-aportes'); // agrupa certo na barra de tarefas do Windows
    protocol.handle(SCHEME, handleAppProtocol);

    // Permissões (pasta de backup, armazenamento persistente...): só as da lista e só para o próprio app.
    const allowed = (permission, url) => ALLOWED_PERMISSIONS.has(permission) && isOwnUrl(url || '');
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      callback(allowed(permission, details?.requestingUrl || webContents.getURL()));
    });
    // O app não usa <webview> nem baixa nada da internet sozinho.
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-attach-webview', event => event.preventDefault());
    });

    buildMenu();
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

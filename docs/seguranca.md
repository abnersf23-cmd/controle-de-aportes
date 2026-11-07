# Segurança do app

Revisão feita em novembro de 2026. Este arquivo explica o que protege o app e por quê.

## O que já estava certo

| Item | Onde | Por que importa |
|---|---|---|
| `contextIsolation`, `sandbox` ligados e `nodeIntegration` desligado | `electron/main.js` | A página não consegue usar o Node.js (ler arquivos, rodar programas) mesmo se for invadida. |
| Sem preload e sem IPC | `electron/main.js` | Não existe "ponte" entre a página e o computador para ser explorada. |
| Proxy com lista fixa de 3 sites e checagem de origem | `electron/proxyRoutes.js` | A página não consegue usar o app para acessar outros sites. |
| Bloqueio de `../` ao servir arquivos | `electron/main.js` | Ninguém lê arquivos fora da pasta `dist/`. |
| Links externos só `https://`, no navegador padrão | `electron/main.js` | A janela do app nunca abre um site de fora. |
| React escapa todo texto na tela; nenhum `dangerouslySetInnerHTML` | `src/` | Um nome de gasto como `<script>` aparece como texto, não vira código (XSS). |
| Backup com senha: PBKDF2 + AES-GCM, sal e IV aleatórios | `src/lib/crypto.js` | Sem a senha o arquivo é ilegível, e qualquer alteração é detectada. |
| Servidor do Vite só em `127.0.0.1` | `vite.config.js` | Ninguém da rede Wi-Fi acessa o app no modo web. |

## O que foi corrigido

| # | Problema | Risco | Correção |
|---|---|---|---|
| 1 | Sem CSP (política de conteúdo) | Médio | `electron/security.js`: só scripts do próprio app, sem `eval`, sem enviar dados para outros sites. O script de tema saiu do `index.html` para `public/tema.js`. |
| 2 | Executável sem "fuses" | Médio | `package.json > build > electronFuses`: o `.exe` não roda como Node.js (`ELECTRON_RUN_AS_NODE`), ignora `NODE_OPTIONS` e `--inspect`, e só carrega o `app.asar` conferido por hash. |
| 3 | Electron 45.2.1 | Médio | Atualizado para 45.2.3 (correções do Chromium). |
| 4 | Qualquer permissão era aceita para o app | Baixo | Lista fechada: pasta de backup, armazenamento persistente, copiar e tela cheia. Câmera, microfone, localização etc. são negados. |
| 5 | `minimatch` vulnerável dentro do electron-builder (GHSA-g3hv-75wg-m249) | Baixo (só na hora de gerar o instalador) | `overrides` no `package.json`. `npm audit`: 0 vulnerabilidades. |
| 6 | Backup com senha aceitava qualquer número de repetições vindo do arquivo | Baixo | Limite de 100 mil a 5 milhões. Backups novos usam 600 mil (OWASP). Os antigos continuam abrindo. |
| 7 | Injeção de fórmula no CSV | Baixo | Texto que começa com `= + - @` ganha `'` na frente (`src/lib/csv.js`). |
| 8 | Importar arquivo gigante travaria o app | Baixo | Limite de 50 MB no backup (`src/pages/Backup.jsx`). Proxy recusa respostas acima de 5 MB. |

## Pontos de atenção (não são falhas do código)

- O **backup automático** grava o JSON **sem senha** na pasta escolhida. Se essa pasta for sincronizada (OneDrive, Google Drive), seus dados financeiros ficam na nuvem em texto puro. Prefira o "Baixar backup" com senha para cópias fora do PC.
- Os dados no IndexedDB (`%APPDATA%\Controle de Aportes`) não são criptografados. Quem usa a sua conta do Windows consegue lê-los. A proteção aqui é a senha do Windows e o BitLocker.

## Como testar

- `npm audit` → `found 0 vulnerabilities`.
- `npm test` → inclui `electron/security.test.js`, `src/lib/csv.test.js` e os testes novos de `src/lib/crypto.test.js`.
- `npx @electron/fuses read --app <caminho do .exe>` → `RunAsNode is Disabled`, `OnlyLoadAppFromAsar is Enabled`.
- No app desktop em modo desenvolvimento (`npm run desktop`, menu Exibir > Ferramentas do desenvolvedor), digite no Console `fetch('https://example.com')`: deve aparecer "violates the following Content Security Policy directive".

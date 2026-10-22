# Controle de Aportes — versão local

Versão local e offline do app **Controle de Aportes** (antes no Base44).
Seus dados ficam **só no seu computador**, dentro do navegador (IndexedDB). Não há login nem servidor na nuvem.

## Como rodar (Windows)

Pré-requisito: [Node.js](https://nodejs.org) versão LTS instalado (`node -v` no terminal mostra a versão).

1. Abra a pasta do projeto no Explorador de Arquivos.
2. Clique na barra de endereço, digite `cmd` e aperte Enter (abre o terminal já nesta pasta).
3. Só na **primeira vez**, instale as dependências:
   ```
   npm install
   ```
4. Para abrir o app:
   ```
   npm run dev
   ```
   O navegador abre em `http://127.0.0.1:5173`. Para fechar o app, volte ao terminal e aperte `Ctrl + C`.

Atalho: dê dois cliques em **`abrir-app.bat`** (faz os passos 3 e 4 sozinho).

> Use sempre o **mesmo navegador** e o mesmo endereço. Os dados ficam guardados por navegador + endereço.

### Primeira vez: importar seus dados

Na tela de boas-vindas, clique em **Importar meus dados** e escolha o arquivo `dados-base44.json` (seus dados exportados do Base44).
Depois de importar, guarde esse arquivo em local seguro ou apague-o: ele contém seus dados financeiros.

## Funcionalidades

| Aba | O que faz |
|---|---|
| Início | "Quanto sobrou esse mês?", divisão por bucket, marcar aporte, cards por categoria, resumo do mês, meta, gráficos |
| FIIs e Ações | Compra/venda, preço médio, cotações automáticas, dividendos recebidos, calendário de dividendos |
| Saques e gastos | Histórico, filtro, gráfico por categoria, exportar CSV, registrar direto pela aba |
| Gastos mensais | Planilha por quinzena (dia 15 e dia 30), **duplicar mês** para 1 a 12 meses (juntar ou substituir), copiar do mês anterior |
| Relatório | Lançamentos por dia/semana/mês, totais, evolução do patrimônio, CSV |
| Projeção | Simulação de 1, 2 ou 5 anos com as taxas atuais |
| Gerenciar ativos | Buckets, taxas, bucket protegido, rebalanceamento para 100% |
| Backup | Baixar e restaurar backup `.json`, backup automático numa pasta |

## Privacidade: o que sai do computador

- **Cotações de ações/FIIs:** o app pede ao Yahoo Finance só o **ticker** (ex.: `MXRF11`).
- **Dólar (botão "Buscar"):** pede à AwesomeAPI só o par `USD-BRL`.
- Nada mais. Sem internet, o app funciona normalmente com as últimas cotações salvas.

O app só aceita conexões do próprio computador (`127.0.0.1`), não da rede.

## Backup (importante)

Como os dados ficam no navegador, **limpar "cookies e dados de sites"** apaga tudo.
Faça backup na aba **Backup** com frequência e guarde o arquivo fora do navegador.

**Backup automático (Chrome/Edge):** na aba Backup, clique em *Escolher pasta…* e escolha uma pasta
(de preferência uma sincronizada com Google Drive/OneDrive, ou um pendrive). A partir daí, sempre que
você alterar algo, o app grava `backup-controle-aportes-AAAA-MM-DD.json` nessa pasta (um arquivo por dia,
mantém os 30 mais recentes). Por segurança, o navegador pede **um clique em "Reativar"** cada vez que o
app é aberto; aparece uma faixa azul no topo para isso.

**Firefox ou sem pasta escolhida:** aparece uma faixa amarela quando o último backup passar de 7 dias,
com o botão *Baixar backup* (ou *Amanhã* para adiar um dia).

> Não escolha a própria pasta do projeto se for usar Git: os arquivos `backup-*.json` já estão no
> `.gitignore`, mas o mais seguro é guardá-los fora do repositório.

## Testes

```
npm test
```
Roda os testes automáticos dos cálculos (juros compostos diários, dólar, rebalanceamento, preço médio, dividendos, meta) e da importação de backup.

## Como o código está organizado

```
src/
  lib/finance.js        Toda a matemática (funções puras, testadas em finance.test.js)
  lib/dates.js          Datas no fuso local
  db/database.js        Banco local (Dexie + IndexedDB): tabelas e índices
  db/backup.js          Exportar/importar JSON (aceita o formato do Base44)
  hooks/useFinanceData  Lê o banco e expõe as ações (aportar, sacar, comprar...)
  services/quotes.js    Cotações (Yahoo) e dólar (AwesomeAPI)
  pages/                Uma tela por aba
  components/           Cards, formulários, gráficos e peças de interface
vite.config.js          Proxy local das cotações (evita bloqueio de CORS)
```

**Por que um proxy?** O navegador bloqueia chamadas de um site para outro domínio quando esse domínio não autoriza (regra de CORS). O Vite, rodando no seu computador, faz a chamada no lugar do navegador e devolve a resposta.

## Diferenças em relação ao app do Base44

- Datas usam o fuso local (o original usava UTC e, depois das 21h, achava que já era o dia/mês seguinte).
- Botão para buscar a cotação do dólar online.
- Formulários em janelas, confirmação antes de excluir e "Desfazer".
- Tema claro/escuro, menu lateral no computador e barra inferior no celular.
- Novos: preço médio por ativo, editar/remover ativo, desmarcar aporte do mês, copiar gastos do mês anterior, projeção de 2 e 5 anos, CSV no relatório, aba Backup.

## Git (controle de versão)

O Git guarda o **histórico** do código: cada *commit* é uma "foto" do projeto que você pode
comparar ou restaurar depois. Ele só cuida do código; seus dados ficam de fora graças ao `.gitignore`
(`dados-*.json`, `backup-*.json`, `node_modules`, `dist`).

**Primeira vez:** instale o [Git para Windows](https://git-scm.com/download/win) (opções padrão) e dê
duplo clique em `iniciar-git.bat`. Ele roda `git init`, `git add .` e `git commit`, e para sozinho
se algum arquivo de dados tentar entrar.

**Comandos do dia a dia** (no terminal, dentro desta pasta):

| Comando | Para que serve |
|---|---|
| `git status` | O que mudou desde o último commit (sempre comece por aqui) |
| `git diff` | Mostra linha a linha o que mudou |
| `git add arquivo` ou `git add .` | Escolhe o que vai no próximo commit ("área de preparação") |
| `git commit -m "mensagem"` | Grava a foto, com uma mensagem dizendo **o que** e **por quê** |
| `git log --oneline` | Lista os commits |
| `git restore arquivo` | Desfaz mudanças **não commitadas** de um arquivo (cuidado: perde a edição) |

Ciclo típico: alterar o código → `git status` → `git diff` → `git add .` → `git commit -m "..."`.

**Publicar no GitHub depois:** crie um repositório **privado** no GitHub e siga as instruções
"push an existing repository". Antes, rode `git status` e confira que nenhum arquivo de dados aparece.

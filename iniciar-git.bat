@echo off
chcp 65001 >nul
rem Cria o repositório Git desta pasta e faz o primeiro commit.
rem Rode UMA vez (duplo clique). Depois use os comandos do README (seção "Git").
cd /d "%~dp0"
title Controle de Aportes - iniciar Git

where git >nul 2>nul
if errorlevel 1 (
  echo O Git ainda não está instalado.
  echo Vou abrir a página de download. Instale com as opções padrão e rode este arquivo de novo.
  start https://git-scm.com/download/win
  pause
  exit /b 1
)

if exist ".git" (
  echo Esta pasta já é um repositório Git. Últimos commits:
  git log --oneline -5
  pause
  exit /b 0
)

rem O Git precisa saber quem assina os commits (fica salvo no seu usuário do Windows).
git config --global user.name >nul 2>nul
if errorlevel 1 goto pedir_nome
goto checar_email
:pedir_nome
set /p NOME=Seu nome para os commits: 
git config --global user.name "%NOME%"
:checar_email
git config --global user.email >nul 2>nul
if errorlevel 1 goto pedir_email
goto iniciar
:pedir_email
set /p EMAIL=Seu e-mail para os commits: 
git config --global user.email "%EMAIL%"

:iniciar
echo.
echo 1) git init -b main  (cria o repositório, com o ramo principal chamado "main")
git init -q -b main
echo 2) git add .  (prepara todos os arquivos, respeitando o .gitignore)
git add .

rem Trava de segurança: nenhum arquivo de dados pode entrar no Git.
git ls-files | findstr /i /r "dados-.*\.json backup-.*\.json node_modules" >nul
if not errorlevel 1 (
  echo.
  echo PARADO: algum arquivo de dados entrou na lista. Nada foi commitado.
  git ls-files | findstr /i /r "dados-.*\.json backup-.*\.json node_modules"
  git rm -r -q --cached .
  pause
  exit /b 1
)

echo.
echo Arquivos que vão entrar no commit (A = adicionado):
git status --short
echo.
echo 3) git commit  (tira a "foto" do projeto neste momento)
git commit -q -m "Commit inicial: Controle de Aportes versão local" --trailer "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>" --trailer "Claude-Session: https://claude.ai/code/session_01AVUiYXdgU4o33FZ9KbFxiu"
if errorlevel 1 (
  echo O commit falhou. Veja a mensagem acima.
  pause
  exit /b 1
)
echo.
echo Pronto! Histórico:
git log --oneline
echo.
echo Seus dados (dados-base44.json, backups) ficaram de fora, como deve ser:
git status --short --ignored
pause

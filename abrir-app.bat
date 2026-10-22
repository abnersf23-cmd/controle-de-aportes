@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org & pause & exit /b)
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install || (pause & exit /b)
)
echo Abrindo o Controle de Aportes... Para fechar, feche esta janela.
call npm run dev
pause

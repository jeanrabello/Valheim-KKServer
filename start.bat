@echo off
REM Lanca o painel de backup do Valheim.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node 18+ antes de usar o painel.
  pause
  exit /b 1
)
if not exist node_modules ( echo Instalando dependencias... & call npm install )
echo Abrindo o painel no navegador...
node server.js
pause

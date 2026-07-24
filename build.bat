@echo off
REM Gera dist\Valheim-Backup.exe (Node embutido). Precisa rodar uma vez so.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo Node.js nao encontrado. & pause & exit /b 1 )
call npm install
call npx pkg . --targets node18-win-x64 --output dist\Valheim-Backup.exe
echo.
echo Pronto: dist\Valheim-Backup.exe
pause

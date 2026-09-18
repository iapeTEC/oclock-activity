@echo off
chcp 65001 >nul
title Prova de Horas em Ingles - deixe esta janela aberta
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Nao encontrei o Node.js neste computador.
  echo  Instale em https://nodejs.org e abra este arquivo de novo.
  echo.
  pause
  exit /b
)

start "" http://localhost:8080/painel
node server.js

echo.
echo  O servidor foi encerrado.
pause

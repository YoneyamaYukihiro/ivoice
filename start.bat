@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo === AI-Voice司会くん 起動 ===
echo.
echo URL: http://localhost:3000/reader
echo （Ctrl+C で停止）
echo.

call npm run dev

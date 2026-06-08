@echo off
chcp 65001 > nul

echo === Node.js プロセスを全終了 ===
echo （他に Node.js を使うアプリ（VS Code 拡張など）が動いていれば
echo  それも止まる点に注意）
echo.

taskkill /F /IM node.exe

echo.
echo 完了
echo.
pause

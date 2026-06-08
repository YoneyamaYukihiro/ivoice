@echo off
echo Stopping all Node.js processes...
echo.
taskkill /F /IM node.exe
echo.
echo --- Remaining Node.js processes (should be empty) ---
tasklist /FI "IMAGENAME eq node.exe"
echo.
pause

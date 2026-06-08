@echo off
start "" powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c','npm run dev > dev-server.log 2>&1' -WindowStyle Hidden -WorkingDirectory '%~dp0'; Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000/reader'"

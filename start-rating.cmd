@echo off
title Personal Rating
cd /d "%~dp0"

set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE_EXE%" (
  echo Node.js runtime was not found.
  echo Please open Codex and ask it to restore the launcher.
  pause
  exit /b 1
)

echo Starting the personal rating page...
echo New photos placed in Image_ckj\cn, jp or kr are detected automatically.
echo Keep this window open while using the page.
echo If the page opens too early, refresh it after a few seconds.
echo.

start "" "http://localhost:3000"
"%NODE_EXE%" ".\scripts\dev-with-gallery.cjs"

echo.
echo The rating page has stopped.
pause

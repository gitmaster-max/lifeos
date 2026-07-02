@echo off
REM ── LifeOS → GitHub, one time setup ─────────────────────────────
REM 1. Create an empty repo at https://github.com/new  (e.g. "lifeos")
REM 2. Double-click this file and paste the repo URL when asked.
REM After this, publishing updates is just: git add -A && git commit -m "update" && git push
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install from https://git-scm.com/download/win or use GitHub Desktop.
  pause & exit /b 1
)

if not exist ".git" (
  git init -b main
  git add -A
  git commit -m "LifeOS v2.1 - life management app"
)

set /p REPO="Paste your GitHub repo URL (e.g. https://github.com/vijay/lifeos.git): "
git remote remove origin >nul 2>nul
git remote add origin %REPO%
git push -u origin main

echo.
echo Done. To host it free: repo Settings ^> Pages ^> Deploy from branch ^> main / (root)
echo Your site will be live at https://YOUR-USERNAME.github.io/REPO-NAME/
pause

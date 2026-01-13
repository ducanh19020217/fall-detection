@echo off
echo 🚀 Starting Fall Detection System Setup...

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: docker is not installed.
    pause
    exit /b 1
)

if not exist .env (
    echo 📝 Creating .env from .env.example...
    copy .env.example .env
    echo ⚠️ Please edit .env to configure your Telegram Bot if needed.
)

if not exist data\snapshots mkdir data\snapshots
if not exist data\uploads mkdir data\uploads

echo 🏗️ Building and starting containers...
docker compose up -d --build

echo ✅ System is starting!
echo 🌐 Frontend: http://localhost
echo 🔐 Default Login: admin / admin
pause

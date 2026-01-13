#!/bin/bash

echo "🚀 Starting Fall Detection System Setup..."

# Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: docker is not installed." >&2
  exit 1
fi

# Check for Docker Compose
if ! [ -x "$(command -v docker-compose)" ]; then
  if ! docker compose version > /dev/null 2>&1; then
    echo "❌ Error: docker-compose is not installed." >&2
    exit 1
  fi
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️ Please edit .env to configure your Telegram Bot if needed."
fi

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/snapshots data/uploads

# Build and start
echo "🏗️ Building and starting containers..."
$DOCKER_COMPOSE up -d --build

echo "✅ System is starting!"
echo "🌐 Frontend: http://localhost"
echo "🔐 Default Login: admin / admin"

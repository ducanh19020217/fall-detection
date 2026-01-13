#!/bin/bash

# Default Docker Hub username
DEFAULT_USER="yourusername"
USER=${1:-$DEFAULT_USER}

echo "🐳 Building and Pushing images for user: $USER"

# 1. Build images
echo "🏗️ Building Backend..."
docker build -t $USER/fall-backend:latest ./backend

echo "🏗️ Building Frontend..."
docker build -t $USER/fall-frontend:latest --build-arg VITE_API_URL=/api ./frontend

# 2. Push images
echo "🚀 Pushing to Docker Hub..."
docker push $USER/fall-backend:latest
docker push $USER/fall-frontend:latest

echo "✅ Done! Users can now deploy using your images."
echo "To deploy, they just need the docker-compose.yml and .env file."

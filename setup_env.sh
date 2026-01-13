#!/bin/bash
set -e

echo "Setting up backend environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Backend setup complete."
echo "To run backend: cd backend && source venv/bin/activate && python -m app.main"

echo "Setting up frontend..."
cd ../frontend
npm install
npm run build

echo "Setup complete!"

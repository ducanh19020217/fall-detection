#!/bin/bash

# Wait for database to be ready if using Postgres
if [ "$DB_TYPE" = "postgres" ]; then
  echo "Waiting for postgres..."
  while ! nc -z $DB_HOST $DB_PORT; do
    sleep 0.1
  done
  echo "PostgreSQL started"
fi

# Run database initialization/migrations
echo "Initializing database..."
python create_admin.py

# Start the application
echo "Starting FastAPI..."
exec python -m app.main

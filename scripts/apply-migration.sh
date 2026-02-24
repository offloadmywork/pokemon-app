#!/bin/bash

# Apply database migration for users table
# This adds the users table and user_id columns to existing tables

MIGRATION_FILE="../migrations/001_add_users.sql"

# Check if running for production
if [ "$1" == "--remote" ]; then
  echo "Applying migration to production D1 database..."
  wrangler d1 execute pokemon-db --remote --file="${MIGRATION_FILE}"
else
  echo "Applying migration to local D1 database..."
  wrangler d1 execute pokemon-db --local --file="${MIGRATION_FILE}"
fi

echo ""
echo "Migration complete!"

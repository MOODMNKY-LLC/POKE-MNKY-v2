#!/bin/bash
# Migration Sync Script for Multi-Machine Setup
# Run this on Machine 1 (where migrations exist)

set -e

echo "=========================================="
echo "Migration Sync for Multi-Machine Setup"
echo "=========================================="
echo ""

# Step 1: Ensure all migrations are committed
echo "Step 1: Checking migration files..."
UNCOMMITTED=$(git status --porcelain supabase/migrations/ | wc -l)

if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "⚠️  Found uncommitted migration files:"
    git status --porcelain supabase/migrations/
    echo ""
    echo "📝 Committing migration files..."
    git add supabase/migrations/
    git commit -m "chore: sync migration files for multi-machine setup

- Add all migration files for Jan 18-19
- Includes draft seeding migrations
- Required for App Agent workflow"
    echo "✅ Migration files committed"
else
    echo "✅ All migration files already committed"
fi

echo ""
echo "Step 2: Pushing to remote..."
git push origin master || git push origin main

echo ""
echo "=========================================="
echo "✅ Migration files synced to git!"
echo "=========================================="
echo ""
echo "Next steps on Machine 2:"
echo "1. git pull origin master  (or main)"
echo "2. Verify files exist: ls -1 supabase/migrations/20260118*.sql"
echo "3. Mark as applied (see MIGRATION-SYNC-FOR-MULTI-MACHINE.md)"
echo ""

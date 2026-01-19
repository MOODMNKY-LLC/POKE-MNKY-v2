#!/bin/bash
# Mark Migrations as Applied - Run on Machine 2
# After pulling migration files from git

set -e

echo "=========================================="
echo "Marking Migrations as Applied"
echo "=========================================="
echo ""
echo "This script marks migrations as applied in production."
echo "Use this AFTER pulling migration files from git."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "Marking migrations as applied..."

supabase migration repair --status applied 20260118093937 --linked && \
supabase migration repair --status applied 20260118094133 --linked && \
supabase migration repair --status applied 20260119072730 --linked && \
supabase migration repair --status applied 20260119074102 --linked && \
supabase migration repair --status applied 20260119081827 --linked && \
supabase migration repair --status applied 20260119082412 --linked && \
supabase migration repair --status applied 20260119082530 --linked && \
supabase migration repair --status applied 20260119083400 --linked && \
supabase migration repair --status applied 20260119111702 --linked && \
supabase migration repair --status applied 20260119113545 --linked && \
supabase migration repair --status applied 20260119114000 --linked && \
supabase migration repair --status applied 20260119114500 --linked && \
supabase migration repair --status applied 20260119120000 --linked && \
supabase migration repair --status applied 20260119120100 --linked && \
supabase migration repair --status applied 20260119130000 --linked

echo ""
echo "=========================================="
echo "✅ All migrations marked as applied!"
echo "=========================================="
echo ""
echo "Verifying migration history..."
supabase migration list --linked | tail -5
echo ""
echo "✅ Migration sync complete!"
echo "You can now run: supabase db pull --linked"

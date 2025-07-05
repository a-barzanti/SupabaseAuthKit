#!/bin/bash
set -euo pipefail

echo "🔧 Starting local Supabase..."

temp_file=$(mktemp)
pnpm supabase:start | tee "$temp_file"

SUPABASE_URL=$(grep "API URL:" "$temp_file" | awk '{print $3}')
SUPABASE_KEY=$(grep "anon key:" "$temp_file" | awk '{print $3}')
POSTGRES_PORT=$(grep "DB URL:" "$temp_file" | sed -E 's/.*:54([0-9]+).*/54\1/')

rm "$temp_file"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]]; then
  echo "💥 Failed to extract values from supabase output."
  exit 1
fi

# Create .env if it doesn't exist
touch .env

# Ensure variables exist in the file; add them if missing
grep -q '^NEXT_PUBLIC_SUPABASE_URL=' .env || echo "NEXT_PUBLIC_SUPABASE_URL=" >> .env
grep -q '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env || echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=" >> .env

# Now update them
sed -i.bak \
  -e "s#^NEXT_PUBLIC_SUPABASE_URL=.*#NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL#" \
  -e "s#^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*#NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY#" \
  .env

rm -f .env.bak

echo "✅ Supabase ready:"
echo "🌐 URL: $SUPABASE_URL"
echo "🔑 Key: $SUPABASE_KEY"
#!/bin/bash
# Sacred Cube TMS - Database Setup Script

set -e

echo "🗄️  Setting up Sacred Cube TMS database..."

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "✅ Database URL: $DATABASE_URL"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🔨 Running database migrations..."
npx prisma migrate deploy

# Check if tables exist
echo "🔍 Verifying database tables..."
npx prisma db execute --stdin <<EOF
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
EOF

echo ""
echo "✅ Database setup complete!"


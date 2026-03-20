#!/bin/bash

echo "=========================================="
echo "NullClaw Integration Setup"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials."
    exit 1
fi

echo "✅ .env.local found"
echo ""

# Check for NEXT_PUBLIC_SUPABASE_URL
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is missing"
fi

# Check for SUPABASE_SERVICE_ROLE_KEY
if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
else
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY is not set"
    echo ""
    echo "To enable NullClaw API, add this to your .env.local:"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "Get your service role key from:"
    echo "https://supabase.com/dashboard/project/jopfsppfjlaijgjnhwxf/settings/api"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Run the profiles table migration:"
echo "   node scripts/create-profiles-table.js"
echo ""
echo "2. Start the dev server:"
echo "   npm run dev"
echo ""
echo "3. Go to http://localhost:3000/settings"
echo ""
echo "4. Generate an API key:"
echo "   openssl rand -hex 32"
echo ""
echo "5. Paste the API key in the Settings page"
echo ""
echo "6. Configure NullClaw with your API key"
echo ""
echo "See NULLCLAW_SETUP.md for full documentation"
echo ""

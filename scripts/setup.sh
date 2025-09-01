#!/bin/bash

# Flowshapr Setup Script
echo "🚀 Setting up Flowshapr..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Create environment files if they don't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating frontend environment file..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local - Please configure your environment variables"
fi

if [ ! -f "server/.env" ]; then
    echo "📝 Creating backend environment file..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env - Please configure your environment variables"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install
cd ..

echo "✅ Dependencies installed successfully!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment variables:"
echo "   - Edit .env.local for frontend settings"
echo "   - Edit server/.env for backend settings (database, OAuth credentials)"
echo ""
echo "2. Set up your PostgreSQL database and run migrations:"
echo "   cd server"
echo "   npm run db:generate"
echo "   npm run db:migrate"
echo ""
echo "3. Start the development servers:"
echo "   # Terminal 1 - Backend"
echo "   cd server && npm run dev"
echo ""
echo "   # Terminal 2 - Frontend" 
echo "   npm run dev"
echo ""
echo "4. Visit http://localhost:3000 to start using Flowshapr!"
echo ""
echo "📚 For more information, see the README.md file."
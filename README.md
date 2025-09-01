# Flowshapr

Flowshapr is a visual drag-and-drop interface for building Firebase Genkit AI flows that allows users to create, manage, and deploy genkit flows to various platforms (Firebase, Google Cloud, AWS, or keep with us). Developers use a thin SDK to call flows remotely.

## Architecture

### Backend (Express.js)
- **Authentication**: Better Auth with PostgreSQL
- **Database**: PostgreSQL with Drizzle ORM
- **Social Providers**: Google, GitHub, Microsoft, Apple
- **Domain-Driven Design**: Organizations, Teams, Users
- **API**: RESTful API with role-based access control

### Frontend (Next.js)
- **UI Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Flow Editor**: React Flow for visual editing
- **Code Generation**: Real-time TypeScript generation
- **Authentication**: Better Auth client integration

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Social OAuth credentials (Google, GitHub, etc.)

### 1. Database Setup

Create a PostgreSQL database and note the connection string.

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Copy environment file
cp .env.example .env

# Edit .env with your database URL and OAuth credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/flowshapr
# BETTER_AUTH_SECRET=your-secret-key
# GOOGLE_CLIENT_ID=your-google-client-id
# ... etc

# Install dependencies
npm install

# Generate database schema
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The backend server will run on http://localhost:3001

### 3. Frontend Setup

```bash
# From project root
# Copy environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
# BACKEND_URL=http://localhost:3001
# NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
# ... etc

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on http://localhost:3000

### 4. OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3001/api/auth/callback/google`

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Authorization callback URL: `http://localhost:3001/api/auth/callback/github`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register new application
3. Add redirect URI: `http://localhost:3001/api/auth/callback/microsoft`

#### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create new Service ID
3. Configure Sign In with Apple
4. Add redirect URI: `http://localhost:3001/api/auth/callback/apple`

## Development Commands

### Backend
```bash
cd server
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## Project Structure

```
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── domains/       # Domain logic (auth, orgs, teams)
│   │   ├── shared/        # Shared utilities and types
│   │   └── infrastructure/ # Database, auth configuration
│   └── drizzle/           # Database migrations
├── src/                   # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   └── lib/              # Utilities and configurations
└── docs/                 # Documentation
```

## Features

### Current
- ✅ User authentication (email/password + social)
- ✅ Organization and team management
- ✅ Role-based access control (admin/developer)
- ✅ Visual flow builder (existing)
- ✅ Code generation (existing)
- ✅ Real-time execution (existing)

### Planned
- 🚧 Flow deployment to multiple platforms
- 🚧 SDK for remote flow execution
- 🚧 Flow versioning and rollback
- 🚧 Team collaboration features
- 🚧 Analytics and monitoring
- 🚧 Flow marketplace

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
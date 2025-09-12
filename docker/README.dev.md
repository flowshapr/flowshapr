# Development Docker Setup

This setup provides a fast development environment with live code reloading.

## Quick Start

```bash
# Navigate to docker directory
cd docker

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop everything
docker-compose -f docker-compose.dev.yml down
```

## Services

- **Frontend**: http://localhost:3000 (Next.js with hot reload)
- **API**: http://localhost:3001 (Express with nodemon)  
- **Executor**: http://localhost:3002 (Genkit execution worker)
- **Database**: localhost:5432 (PostgreSQL)

## Key Features

- ✅ **Live Code Reload**: Changes to source files are reflected immediately
- ✅ **Volume Mounts**: Your local source code is mounted into containers
- ✅ **Fast Startup**: No build step required, uses `npm run dev`
- ✅ **Separate node_modules**: Prevents conflicts with host system
- ✅ **Database Persistence**: Dev data persists between restarts

## Development Workflow

1. Start containers: `docker-compose -f docker-compose.dev.yml up -d`
2. Make code changes in your IDE
3. Changes are automatically reflected in running containers
4. View logs: `docker-compose -f docker-compose.dev.yml logs -f [service]`

## Useful Commands

```bash
# Restart a single service
docker-compose -f docker-compose.dev.yml restart frontend

# Execute commands in running container
docker-compose -f docker-compose.dev.yml exec frontend npm install zustand

# View service logs
docker-compose -f docker-compose.dev.yml logs frontend

# Clean restart (removes volumes)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## Environment Variables

Development environment variables are set in the compose file. To override:

```bash
# Create .env file in docker directory
echo "DATABASE_URL=postgresql://user:pass@postgres:5432/mydb" > .env
```

## Troubleshooting

- **Port conflicts**: Make sure ports 3000, 3001, 3002, 5432 are available
- **File watching**: If hot reload isn't working, check the polling environment variables
- **Node modules**: If packages are missing, restart the affected service
- **Database connection**: Ensure postgres is healthy before starting other services
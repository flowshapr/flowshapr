# Flowshapr Coolify Deployment Guide

This guide covers deploying Flowshapr to production using Coolify, a self-hosted alternative to Heroku and Vercel.

## 🏗️ Architecture Overview

Flowshapr consists of multiple services:

- **Frontend**: Next.js application (`app.flowshapr.ai`)
- **API**: Express.js backend (`api.flowshapr.ai`)  
- **Database**: PostgreSQL (internal network only)
- **Execution Workers**: Genkit containers for AI flow execution (internal network only)

## 📋 Prerequisites

- Coolify instance running on your server
- Domain names configured:
  - `app.flowshapr.ai` → Frontend
  - `api.flowshapr.ai` → Backend API
- SSL certificates (handled automatically by Coolify)
- Required API keys (Google AI, OpenAI, Anthropic, OAuth providers)

## 🚀 Deployment Steps

### 1. Prepare Your Repository

Ensure your repository contains these files:
- `docker-compose.prod.yml` - Main production configuration
- `Dockerfile.frontend` - Frontend container build
- `server/Dockerfile` - Backend container build
- `server/docker/execution/Dockerfile` - Execution worker containers
- `.env.production.example` - Environment variable template

### 2. Create a New Application in Coolify

1. **Login to Coolify Dashboard**
2. **Create New Application**:
   - Choose "Docker Compose" type
   - Connect your Git repository
   - Select the branch to deploy (typically `main` or `production`)

### 3. Configure Docker Compose

1. **Upload Configuration**:
   - Copy contents of `docker-compose.prod.yml`
   - Paste into Coolify's Docker Compose configuration

2. **Set Build Context**:
   - Set the build context to the root directory of your repository

### 4. Environment Variables Configuration

Configure these environment variables in Coolify:

#### Database Configuration
```bash
DB_PASSWORD=your-secure-database-password
```

#### Authentication
```bash
BETTER_AUTH_SECRET=your-32-character-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_CLIENT_ID=your-github-oauth-client-id  
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
```

#### AI Provider Keys
```bash
GOOGLE_AI_API_KEY=your-google-ai-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

#### Application URLs
```bash
FRONTEND_URL=https://app.flowshapr.ai
API_URL=https://api.flowshapr.ai
```

### 5. Domain Configuration

#### Frontend Domain (app.flowshapr.ai)
1. Navigate to your application settings
2. Add domain: `app.flowshapr.ai`
3. Configure DNS A record pointing to your server IP
4. Enable SSL certificate generation

#### Backend Domain (api.flowshapr.ai)  
1. Add domain: `api.flowshapr.ai`
2. Configure DNS A record pointing to your server IP
3. Enable SSL certificate generation

### 6. Network and Security

The deployment uses a custom Docker network (`flowshapr-network`) with these security features:

- **Frontend**: Publicly accessible via `app.flowshapr.ai`
- **API**: Publicly accessible via `api.flowshapr.ai`
- **Database**: Internal network only, not exposed externally
- **Workers**: Internal network only, communicate via HTTP with main API

### 7. Persistent Storage

Coolify will automatically create persistent storage for:
- PostgreSQL database data (`./data/postgres`)
- Application logs (`./data/api/logs`)  
- Temporary files (`./data/api/temp`)

## 🔧 Advanced Configuration

### Scaling Execution Workers

To add more execution workers for increased capacity:

1. **Edit Docker Compose**:
   - Add additional `genkit-executor-N` services
   - Increment the executor ID number
   - Follow the same pattern as existing workers

2. **Update Backend Configuration**:
   ```bash
   MAX_CONCURRENT_CONTAINERS=15  # Increase based on worker count
   ```

### Resource Limits

Current resource allocations:
- **Frontend**: 1GB RAM, 1 CPU core
- **Backend**: 2GB RAM, 2 CPU cores  
- **Database**: 2GB RAM, 1 CPU core
- **Each Worker**: 1GB RAM, 1 CPU core

Adjust in `docker-compose.prod.yml` under `deploy.resources` sections.

### Monitoring and Health Checks

All services include health checks:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds  
- **Retries**: 3 attempts
- **Start Period**: 60 seconds

Health endpoints:
- Frontend: `http://localhost:3000/api/health`
- Backend: `http://localhost:3001/health`
- Workers: `http://localhost:3000/health`

## 🔍 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs in Coolify
# Ensure all required files are present
# Verify Docker context is set to repository root
```

#### Database Connection Issues
```bash
# Verify DATABASE_URL or individual DB_* variables
# Check PostgreSQL service health
# Ensure database initialization completed
```

#### Container Communication
```bash
# Verify all services are on the same network
# Check internal service names match docker-compose service names
# Review port configurations
```

### Logs and Debugging

Access logs through Coolify dashboard:
1. Navigate to your application
2. Select the specific service (frontend/api/workers/database)
3. View real-time logs and metrics

### Manual Commands

Connect to containers for debugging:
```bash
# Connect to API container
docker exec -it flowshapr-api sh

# Connect to database
docker exec -it flowshapr-postgres psql -U flowshapr -d flowshapr

# View worker logs  
docker logs flowshapr-genkit-executor-1
```

## 🔄 Updates and Maintenance

### Deploying Updates

1. **Push changes** to your connected Git branch
2. **Trigger deployment** in Coolify (automatic or manual)
3. **Monitor deployment** progress and health checks
4. **Verify services** are running and responding correctly

### Database Migrations

Database migrations run automatically on backend startup:
```bash
# Migrations are handled in the backend service startup
# Check backend logs for migration status
```

### Backup Recommendations

1. **Database backups**: Configure automated PostgreSQL backups
2. **Application data**: Backup persistent volumes
3. **Environment variables**: Export and securely store configuration
4. **Docker images**: Consider private registry for custom images

## 📊 Performance Monitoring

### Key Metrics to Monitor

- **Response times**: Frontend and API response times
- **Resource usage**: CPU, memory, disk usage per service
- **Database performance**: Connection count, query performance
- **Worker utilization**: Execution queue size, success rates

### Scaling Considerations

- **Horizontal scaling**: Add more execution workers as needed
- **Vertical scaling**: Increase resource limits for high-traffic periods
- **Database optimization**: Monitor query performance and add indexes
- **CDN**: Consider adding CDN for static frontend assets

## 🔒 Security Checklist

- [ ] All secrets properly configured as environment variables
- [ ] Database not exposed to external network
- [ ] SSL certificates configured and auto-renewing
- [ ] Rate limiting enabled on API endpoints
- [ ] Container users are non-root
- [ ] Docker socket access properly secured
- [ ] Regular security updates scheduled

## 📞 Support

For deployment issues:
1. Check Coolify documentation
2. Review service logs in Coolify dashboard
3. Verify environment variables are correctly set
4. Test individual service health endpoints
5. Check DNS configuration and SSL certificates

---

**Note**: This deployment configuration is optimized for production use with security best practices, resource limits, and monitoring capabilities.
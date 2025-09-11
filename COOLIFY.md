# Coolify Deployment Guide

This guide explains how to deploy Flowshapr to Coolify using Docker Compose.

## 🔧 Coolify-Compatible Features

The `docker/docker-compose.coolify.yml` file has been configured with all the latest Coolify requirements:

### ✅ Required Labels
- `coolify.managed=true` - Marks services as Coolify-managed
- `coolify.type` - Specifies service types (application, database, service)  
- `coolify.name` - Service identification for Coolify UI

### ✅ Magic Environment Variables
- `${SERVICE_FQDN_*}` - Auto-generated fully qualified domain names
- `${SERVICE_URL_*}` - Auto-generated service URLs
- `${VARIABLE:?}` - Required variables (must be set before deployment)
- `${VARIABLE:-default}` - Variables with default values

### ✅ Traefik Integration
- Automatic SSL certificates with Let's Encrypt
- Host-based routing for frontend and API
- Proper load balancer configuration

### ✅ Volume Management
- Named volumes with Coolify labels
- Persistent storage for database, logs, and temp files
- Proper volume labeling for Coolify management

## 🚀 Deployment Steps

### 1. Connect Repository
1. In Coolify, create a new project
2. Click "Create New Resource" 
3. Select "Docker Compose" build pack
4. Connect your Git repository

### 2. Configure Environment Variables

#### Required Variables (⚠️ Must be set):
```env
DATABASE_PASSWORD=your_secure_db_password
BETTER_AUTH_SECRET=your_32_character_secret_key
```

#### Optional Variables:
```env
# Database
DATABASE_NAME=flowshapr
DATABASE_USER=flowshapr

# AI Providers  
GOOGLE_AI_API_KEY=your_google_ai_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Social Auth (OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Performance Tuning
CONTAINER_EXECUTOR_TIMEOUT=60000
MAX_CONCURRENT_CONTAINERS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Configure Domains

Coolify will automatically generate FQDNs, but you can customize:

- **Frontend**: `app.yourdomain.com` (or use Coolify's generated domain)
- **API**: `api.yourdomain.com` (or use Coolify's generated domain)

### 4. Deploy

1. Set **Docker Compose Location** to `docker/docker-compose.coolify.yml`
2. Click "Deploy" in Coolify
3. Monitor the build process in real-time
4. Coolify will automatically:
   - Build all Docker images
   - Set up networking
   - Configure SSL certificates
   - Start services in dependency order

**Note**: For local testing, use: `docker-compose -f docker/docker-compose.local.yml up`

## 🏗️ Service Architecture

### Services Deployed:
- **postgres** - PostgreSQL 16 database (internal only)
- **api** - Express.js backend API (publicly accessible)
- **frontend** - Next.js application (publicly accessible)  
- **genkit-executor-1/2/3** - AI execution workers (internal only)

### Network Configuration:
- Services communicate internally via Docker networking
- Only frontend and API are exposed via Traefik
- Database and workers are internal-only for security

### Health Checks:
- All services include comprehensive health checks
- Proper startup dependencies ensure services start in order
- Auto-restart on failure with `unless-stopped` policy

## 🔒 Security Features

- Database not exposed externally
- AI execution workers internal-only
- SSL/TLS termination via Traefik
- Environment variable validation
- Secure secrets management via Coolify UI

## 📊 Monitoring & Management

Coolify provides:
- Real-time logs for all services
- Resource usage monitoring
- Automatic restarts and health monitoring
- Easy scaling of execution workers
- Environment variable management UI

## 🔧 Customization Options

### Scaling Workers:
To add more execution workers, duplicate the `genkit-executor-*` service configuration and update the `EXECUTOR_URLS` environment variable in the API service.

### Custom Domains:
Update the Traefik router rules in service labels to use your custom domains.

### Performance Tuning:
Adjust resource limits and environment variables based on your usage patterns.

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures**: Check that all required environment variables are set
2. **Health Check Failures**: Verify service startup order and dependencies  
3. **Database Connection**: Ensure `DATABASE_PASSWORD` is set correctly
4. **Auth Issues**: Verify `BETTER_AUTH_SECRET` is a secure 32+ character string

### Logs Access:
Access logs for each service through the Coolify dashboard to diagnose issues.

## 📝 Notes

- The compose file uses the latest Coolify v4+ features
- All magic environment variables are automatically populated by Coolify
- Services will auto-restart unless explicitly stopped
- Volumes persist data across deployments
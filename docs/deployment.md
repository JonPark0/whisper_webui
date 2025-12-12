# Deployment Guide

Production deployment guide for Whisper WebUI.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Production Configuration](#production-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)

## Prerequisites

### System Requirements

**Minimum:**
- 4 CPU cores
- 8GB RAM
- 50GB disk space
- Ubuntu 20.04+ or similar Linux distribution

**Recommended:**
- 8+ CPU cores
- 16GB+ RAM
- 100GB+ SSD storage
- NVIDIA GPU with 8GB+ VRAM (for fast transcription)

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- NVIDIA Container Toolkit (for GPU support)
- Reverse proxy (nginx, Traefik, Caddy)
- SSL certificate (Let's Encrypt recommended)

## Deployment Options

### Option 1: Single Server (Docker Compose)

**Best for:**
- Small to medium workloads
- Personal or team use
- Budget-conscious deployments

**Pros:**
- Simple setup
- Easy to maintain
- Low resource overhead

**Cons:**
- Single point of failure
- Limited scalability
- No automatic failover

### Option 2: Kubernetes Cluster

**Best for:**
- High availability requirements
- Large scale deployments
- Multiple teams or tenants

**Pros:**
- High availability
- Auto-scaling
- Load balancing
- Rolling updates

**Cons:**
- Complex setup
- Higher resource overhead
- Requires Kubernetes expertise

### Option 3: Cloud Platforms

**Supported platforms:**
- AWS (ECS, EKS)
- Google Cloud (GKE)
- Azure (AKS)
- DigitalOcean (App Platform)

## Production Configuration

### Environment Variables

Create production `.env`:

```bash
# API Keys (REQUIRED)
GEMINI_API_KEY=your-production-gemini-key

# Whisper Configuration
WHISPER_MODEL=openai/whisper-large-v3-turbo
ENABLE_FLASH_ATTENTION=true  # If GPU supports it

# Server Configuration
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
FRONTEND_PORT=5173
RELOAD_MODE=false  # Disable in production

# CORS Configuration (IMPORTANT: Set to your domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# File Configuration
MAX_FILE_SIZE=500MB
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/outputs

# Processing Configuration
DEFAULT_TIMEOUT=7200  # 2 hours for large files

# Database Configuration
DB_PATH=/app/data/whisper.db

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Logging Configuration
LOG_LEVEL=INFO  # INFO or WARNING for production
LOG_FORMAT=json  # Structured logging
```

### Security Checklist

- [ ] Change default ports if exposed
- [ ] Set strong `ALLOWED_ORIGINS`
- [ ] Use HTTPS with valid SSL certificate
- [ ] Enable firewall (UFW, iptables)
- [ ] Set up fail2ban for brute force protection
- [ ] Regular security updates
- [ ] Backup encryption keys
- [ ] Monitor logs for suspicious activity

## Docker Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install NVIDIA Container Toolkit (if using GPU)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/whisper_webui.git
cd whisper_webui

# Create production .env
cp .env.example .env
nano .env  # Edit with production values

# Set proper permissions
./fix-permissions.sh
```

### 3. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: whisper_redis
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - whisper_network
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: whisper_backend
    restart: always
    user: "1000:1000"
    volumes:
      - uploads:/app/uploads
      - outputs:/app/outputs
      - models:/app/models
      - data:/app/data
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=1
      - RELOAD_MODE=false
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - redis
    networks:
      - whisper_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: whisper_celery_worker
    restart: always
    user: "1000:1000"
    ipc: host
    ulimits:
      memlock: -1
      stack: 67108864
    command: celery -A celery_app worker --loglevel=info --pool=solo --concurrency=1
    volumes:
      - uploads:/app/uploads
      - outputs:/app/outputs
      - models:/app/models
      - data:/app/data
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - C_FORCE_ROOT=false
    depends_on:
      - redis
      - backend
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    networks:
      - whisper_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=https://yourdomain.com
    container_name: whisper_frontend
    restart: always
    networks:
      - whisper_network

  nginx:
    image: nginx:alpine
    container_name: whisper_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - uploads:/app/uploads:ro
    depends_on:
      - backend
      - frontend
    networks:
      - whisper_network

volumes:
  uploads:
  outputs:
  models:
  data:
  redis_data:

networks:
  whisper_network:
    driver: bridge
```

### 4. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

    # Upstream backends
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:5173;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Max upload size
        client_max_body_size 500M;

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for long-running requests
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Upload endpoint (separate rate limit)
        location /api/upload {
            limit_req zone=upload_limit burst=5 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 5. SSL Certificate

**Using Let's Encrypt:**

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet
```

### 6. Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Verify health
curl -k https://yourdomain.com/
```

## Monitoring

### Setup Monitoring Stack

**Prometheus + Grafana:**

Add to `docker-compose.prod.yml`:

```yaml
  prometheus:
    image: prom/prometheus
    container_name: whisper_prometheus
    restart: always
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - whisper_network

  grafana:
    image: grafana/grafana
    container_name: whisper_grafana
    restart: always
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - whisper_network
```

### Application Metrics

**Add to backend:**

```python
# Install: pip install prometheus-fastapi-instrumentator
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)
```

### Log Aggregation

**Using Loki:**

```bash
# Add Loki driver
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions

# Configure in docker-compose.prod.yml
logging:
  driver: loki
  options:
    loki-url: "http://localhost:3100/loki/api/v1/push"
```

## Backup and Recovery

### Automated Backups

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/whisper"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T backend sqlite3 /app/data/whisper.db ".backup /app/data/backup_$DATE.db"
docker cp whisper_backend:/app/data/backup_$DATE.db $BACKUP_DIR/

# Backup uploads and outputs
docker run --rm -v whisper_webui_uploads:/uploads -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /uploads .
docker run --rm -v whisper_webui_outputs:/outputs -v $BACKUP_DIR:/backup alpine tar czf /backup/outputs_$DATE.tar.gz -C /outputs .

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule with cron:**

```bash
sudo crontab -e
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

### Recovery

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
docker cp backup_20240115_020000.db whisper_backend:/app/data/whisper.db

# Restore uploads
docker run --rm -v whisper_webui_uploads:/uploads -v /backups/whisper:/backup alpine tar xzf /backup/uploads_20240115_020000.tar.gz -C /uploads

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Scaling

### Horizontal Scaling

**Multiple Celery workers:**

```yaml
  celery_worker_1:
    <<: *celery_worker_config
    container_name: whisper_celery_worker_1

  celery_worker_2:
    <<: *celery_worker_config
    container_name: whisper_celery_worker_2
```

**Load-balanced backends:**

```nginx
upstream backend {
    least_conn;
    server backend_1:8000;
    server backend_2:8000;
}
```

### Database Migration

**Move to PostgreSQL:**

```yaml
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: whisper
      POSTGRES_USER: whisper
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

Update `backend/database.py` to use PostgreSQL connection string.

## Maintenance

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Cleanup old images
docker image prune -a -f
```

### Health Checks

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100 | grep ERROR

# Test API
curl -f https://yourdomain.com/ || echo "API down!"
```

## Troubleshooting

See [Common Issues](development.md#common-issues) in Development Guide.

## Next Steps

- [Monitoring Setup](monitoring.md) - Detailed monitoring guide
- [Security Hardening](security.md) - Advanced security measures
- [Performance Tuning](performance.md) - Optimize for scale

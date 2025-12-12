# Configuration Guide

Complete guide to configuring Whisper WebUI.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Whisper Configuration](#whisper-configuration)
- [Server Configuration](#server-configuration)
- [Security Configuration](#security-configuration)
- [File Handling](#file-handling)
- [Logging Configuration](#logging-configuration)
- [Advanced Configuration](#advanced-configuration)

## Environment Variables

All configuration is done via the `.env` file in the project root.

### Creating Configuration File

```bash
# Copy example
cp .env.example .env

# Edit configuration
nano .env
```

## API Keys

### Gemini API Key (Required)

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

**How to obtain:**

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Go to "Get API Key"
4. Create new key or use existing
5. Copy and paste into `.env`

**Free tier limits:**
- 60 requests per minute
- 1500 requests per day

**Paid tier:** Higher limits, better performance

## Whisper Configuration

### Model Selection

```bash
WHISPER_MODEL=openai/whisper-large-v3-turbo
```

**Available models:**

| Model | Size | Speed | Accuracy | VRAM |
|-------|------|-------|----------|------|
| `openai/whisper-tiny` | 39M | Fastest | Low | ~1GB |
| `openai/whisper-base` | 74M | Fast | Medium | ~1GB |
| `openai/whisper-small` | 244M | Medium | Good | ~2GB |
| `openai/whisper-medium` | 769M | Slow | Better | ~5GB |
| `openai/whisper-large-v2` | 1550M | Slower | Best | ~10GB |
| `openai/whisper-large-v3` | 1550M | Slower | Best | ~10GB |
| `openai/whisper-large-v3-turbo` | 809M | Fast | Best | ~6GB |

**Recommendations:**

- **Development:** `whisper-base` or `whisper-small`
- **Production (CPU):** `whisper-small` or `whisper-medium`
- **Production (GPU):** `whisper-large-v3-turbo` (best balance)
- **Best Quality:** `whisper-large-v3`

### Flash Attention

```bash
ENABLE_FLASH_ATTENTION=false
```

**Flash Attention 2** improves GPU performance significantly.

**Requirements:**
- NVIDIA GPU with Ampere architecture or newer (RTX 30xx, A100, etc.)
- CUDA 11.8+
- Sufficient VRAM

**Benefits:**
- 2-3x faster inference
- Lower memory usage
- Better throughput

**When to enable:**
- Have compatible GPU
- Processing large files
- High volume workloads

**When to disable:**
- CPU-only processing
- Older GPU architecture
- Installation issues

## Server Configuration

### Ports

```bash
BACKEND_PORT=8000
FRONTEND_PORT=5173
```

**Change if:**
- Ports are already in use
- Running multiple instances
- Firewall restrictions

**Example multi-instance:**
```bash
# Instance 1
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Instance 2
BACKEND_PORT=8001
FRONTEND_PORT=5174
```

### Host Binding

```bash
BACKEND_HOST=0.0.0.0
```

**Options:**
- `0.0.0.0` - Listen on all interfaces (default)
- `127.0.0.1` - Localhost only (more secure)
- Specific IP - Bind to particular interface

### Reload Mode

```bash
RELOAD_MODE=true
```

**Development:** `true` - Auto-reload on code changes
**Production:** `false` - No auto-reload (better performance)

## Security Configuration

### CORS Origins

```bash
ALLOWED_ORIGINS=http://localhost:5173
```

**Critical for security!** Only allow trusted origins.

**Development:**
```bash
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Production:**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Multiple origins:**
- Separate with commas
- No spaces
- Include protocol (`http://` or `https://`)
- Include port if non-standard

**Security implications:**
- Too permissive = CSRF attacks possible
- Too restrictive = Frontend can't connect
- Never use `*` in production

## File Handling

### Maximum File Size

```bash
MAX_FILE_SIZE=500MB
```

**Units supported:**
- `KB` - Kilobytes
- `MB` - Megabytes (recommended)
- `GB` - Gigabytes
- Raw number - Bytes

**Considerations:**

| Size | Use Case | Upload Time | Storage |
|------|----------|-------------|---------|
| 100MB | Short clips | ~30s | Low |
| 500MB | Medium files | ~2min | Medium |
| 1GB | Long recordings | ~5min | High |
| 2GB+ | Very long audio | ~10min+ | Very High |

**Recommendations:**
- **Personal use:** 500MB - 1GB
- **Team use:** 1GB - 2GB
- **Enterprise:** 2GB+

**Limits:**
- Nginx: Update `client_max_body_size`
- Disk space: Monitor available storage
- Processing time: Larger = slower

### Storage Directories

```bash
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/outputs
```

**Default locations (in container):**
- `/app/uploads` - Uploaded audio files
- `/app/outputs` - Generated transcripts
- `/app/models` - Cached AI models
- `/app/data` - SQLite database

**Change if:**
- Custom mount points
- Network storage
- Specific permissions needed

### Processing Timeout

```bash
DEFAULT_TIMEOUT=3600
```

**Value in seconds:**
- `3600` = 1 hour (default)
- `7200` = 2 hours
- `14400` = 4 hours

**Calculate required timeout:**
```
Timeout = (File duration × 2) + Buffer

Example for 1-hour audio:
Timeout = (3600 × 2) + 1800 = 9000 seconds (2.5 hours)
```

**Factors affecting processing time:**
- File duration
- Model size
- CPU/GPU performance
- Chunk settings

## Database Configuration

### Database Path

```bash
DB_PATH=/app/data/whisper.db
```

**SQLite database location.**

**Backup considerations:**
- Regular backups essential
- Include in volume backups
- Consider external backup service

**Migration to PostgreSQL:**

For production, consider PostgreSQL:

```bash
# Instead of DB_PATH, use:
DATABASE_URL=postgresql://user:password@host:5432/whisper
```

Update `backend/database.py` accordingly.

## Redis Configuration

```bash
REDIS_URL=redis://redis:6379/0
```

**Format:**
```
redis://[password]@host:port/db
```

**With password:**
```bash
REDIS_URL=redis://:mypassword@redis:6379/0
```

**External Redis:**
```bash
REDIS_URL=redis://redis.example.com:6379/0
```

## Logging Configuration

### Log Level

```bash
LOG_LEVEL=INFO
```

**Levels (increasing verbosity):**

| Level | Use Case | Output Volume |
|-------|----------|---------------|
| `ERROR` | Production (minimal) | Very Low |
| `WARNING` | Production (normal) | Low |
| `INFO` | Production/Development | Medium |
| `DEBUG` | Development/Troubleshooting | High |

**Recommendations:**
- **Development:** `DEBUG`
- **Staging:** `INFO`
- **Production:** `INFO` or `WARNING`

### Log Format

```bash
LOG_FORMAT=json
```

**Options:**

**`json` (Structured logging):**
```json
{"timestamp": "2024-01-15T10:30:00", "level": "INFO", "message": "Job completed", "job_id": 123}
```

**Benefits:**
- Easy to parse
- Works with log aggregation tools (Loki, ELK)
- Searchable
- Machine-readable

**`text` (Human-readable):**
```
2024-01-15 10:30:00 - INFO - Job completed - job_id: 123
```

**Benefits:**
- Easier to read manually
- Better for development
- Familiar format

**Recommendation:**
- **Development:** `text`
- **Production:** `json`

## Advanced Configuration

### Celery Configuration

Edit `backend/celery_app.py`:

```python
app = Celery(
    'whisper_tasks',
    broker=settings.redis_url,
    backend=settings.redis_url,
    broker_connection_retry_on_startup=True,
    task_track_started=True,
    task_time_limit=3600,  # Hard timeout
    task_soft_time_limit=3300,  # Soft timeout
    worker_prefetch_multiplier=1,  # One task at a time
    worker_max_tasks_per_child=10,  # Restart worker after 10 tasks
)
```

**Key settings:**

- `task_time_limit`: Maximum task execution time
- `task_soft_time_limit`: Graceful timeout warning
- `worker_prefetch_multiplier`: How many tasks to fetch
- `worker_max_tasks_per_child`: Memory leak prevention

### Docker Resource Limits

Edit `docker-compose.yml`:

```yaml
  celery_worker:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 16G
        reservations:
          cpus: '2.0'
          memory: 8G
```

**Adjust based on:**
- Available hardware
- Expected workload
- Number of workers

### Nginx Tuning

Edit `nginx.conf`:

```nginx
# Worker processes
worker_processes auto;

# Connection limits
worker_connections 2048;

# Buffer sizes
client_body_buffer_size 128k;
client_max_body_size 500M;

# Timeouts
client_body_timeout 300s;
client_header_timeout 60s;
send_timeout 300s;

# Keepalive
keepalive_timeout 65s;
keepalive_requests 100;
```

## Configuration Examples

### Minimal (Development)

```bash
GEMINI_API_KEY=your-key
WHISPER_MODEL=openai/whisper-base
ENABLE_FLASH_ATTENTION=false
RELOAD_MODE=true
LOG_LEVEL=DEBUG
LOG_FORMAT=text
```

### Recommended (Production)

```bash
GEMINI_API_KEY=your-production-key
WHISPER_MODEL=openai/whisper-large-v3-turbo
ENABLE_FLASH_ATTENTION=true
BACKEND_PORT=8000
FRONTEND_PORT=5173
RELOAD_MODE=false
ALLOWED_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE=1GB
DEFAULT_TIMEOUT=7200
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### High Performance (GPU)

```bash
GEMINI_API_KEY=your-key
WHISPER_MODEL=openai/whisper-large-v3-turbo
ENABLE_FLASH_ATTENTION=true
MAX_FILE_SIZE=2GB
DEFAULT_TIMEOUT=14400
LOG_LEVEL=WARNING
LOG_FORMAT=json
```

### Low Resource (CPU Only)

```bash
GEMINI_API_KEY=your-key
WHISPER_MODEL=openai/whisper-small
ENABLE_FLASH_ATTENTION=false
MAX_FILE_SIZE=100MB
DEFAULT_TIMEOUT=7200
LOG_LEVEL=INFO
```

## Validation

### Check Configuration

```bash
# View current configuration
docker-compose config

# Validate .env file
cat .env | grep -v '^#' | grep -v '^$'

# Test API with configuration
curl http://localhost:8000/
```

### Common Issues

**Issue:** Backend can't connect to Redis
```bash
# Check Redis URL
docker-compose exec backend env | grep REDIS_URL

# Test Redis connection
docker-compose exec redis redis-cli ping
```

**Issue:** CORS errors
```bash
# Check allowed origins
docker-compose exec backend env | grep ALLOWED_ORIGINS

# Should match frontend URL exactly
```

**Issue:** File upload fails
```bash
# Check file size limit
docker-compose exec backend env | grep MAX_FILE_SIZE

# Check nginx limit
docker-compose exec nginx grep client_max_body_size /etc/nginx/nginx.conf
```

## Next Steps

- [Security Guide](security.md) - Secure your configuration
- [Deployment Guide](deployment.md) - Deploy with configuration
- [Development Guide](development.md) - Development configuration

# Whisper WebUI - Quick Start Deployment

## 🚀 Quick Start (Fresh Installation)

### Prerequisites
- Docker & Docker Compose
- NVIDIA GPU with CUDA support
- NVIDIA Container Toolkit

### Installation Steps

```bash
# 1. Clone repository
cd /home/ycubuntu/Projects/web/whisper/whisper_webui

# 2. Run database migration
cd backend
python migrate_add_archived.py
cd ..

# 3. Install dependencies
# Backend
cd backend && pip install -r requirements.txt && cd ..

# Frontend
cd frontend && npm install && cd ..

# 4. Fix permissions (important for non-root execution)
chmod +x fix-permissions.sh
./fix-permissions.sh

# 5. Create .env file (optional)
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
BACKEND_PORT=8000
FRONTEND_PORT=5173
REDIS_URL=redis://redis:6379/0
EOF

# 6. Start all services
docker-compose up --build
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔧 Service Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker logs whisper_backend -f
docker logs whisper_celery_worker -f
docker logs whisper_redis -f
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
docker-compose up --build
```

---

## 📊 Monitoring

### Check Celery Worker Status
```bash
docker logs whisper_celery_worker -f
```

**Healthy Output:**
```
[INFO] celery@worker ready.
[INFO] Starting transcription job 5
[INFO] Completed transcription job 5
```

### Check Redis Queue
```bash
docker exec -it whisper_redis redis-cli

# Inside Redis CLI:
LLEN celery           # Number of pending tasks
KEYS celery*          # All Celery keys
```

### Check Job Status
```bash
curl http://localhost:8000/api/jobs
```

---

## 🐛 Troubleshooting

### Celery Worker Not Starting

**Symptom:** Jobs stay in "pending" forever

**Solution:**
```bash
docker logs whisper_celery_worker
docker-compose restart celery_worker
```

### Permission Errors

**Symptom:**
```
PermissionError: [Errno 13] Permission denied: '/app/uploads/...'
```

**Solution:**
```bash
./fix-permissions.sh
docker-compose restart
```

### Redis Connection Refused

**Symptom:**
```
ConnectionRefusedError: [Errno 111] Connection refused
```

**Solution:**
```bash
docker ps | grep redis  # Check if Redis is running
docker-compose restart redis backend celery_worker
```

### GPU Not Available

**Symptom:** Celery worker crashes with CUDA errors

**Solution:**
```bash
# Check NVIDIA runtime
nvidia-smi

# Ensure Docker has GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# Verify docker-compose.yml has GPU config
grep -A 5 "deploy:" docker-compose.yml
```

### Out of Memory

**Symptom:** Worker crashes during transcription

**Solution:**
1. Reduce concurrent workers in docker-compose.yml:
   ```yaml
   command: celery -A celery_app worker --loglevel=info --concurrency=1
   ```

2. Restart services:
   ```bash
   docker-compose up --build
   ```

---

## ⚙️ Configuration

### Adjust Concurrent Workers

Edit `docker-compose.yml`:
```yaml
celery_worker:
  command: celery -A celery_app worker --loglevel=info --concurrency=2
  #                                                     Change here ^^^
```

**Recommendations:**
- **1 worker**: 8-12GB GPU VRAM
- **2 workers** (default): 16-24GB GPU VRAM
- **3-4 workers**: 24GB+ GPU VRAM

### Change Ports

Edit `.env` file:
```env
BACKEND_PORT=8080
FRONTEND_PORT=3000
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

---

## 🔒 Security

### Running as Non-Root

All services run as UID 1000 (non-root) for security:
- Backend: `user: "1000:1000"`
- Celery Worker: `user: "1000:1000"`

### PyTorch Shared Memory Configuration

Celery worker uses host IPC for optimal PyTorch performance:
```yaml
celery_worker:
  ipc: host  # Shared memory for PyTorch
  ulimits:
    memlock: -1  # Unlimited locked memory
    stack: 67108864  # 64MB stack size
```

**Why this is needed:**
- PyTorch uses shared memory for efficient GPU tensor operations
- Default Docker SHMEM limit (64MB) is insufficient
- `ipc: host` shares host's IPC namespace with unlimited shared memory
- Prevents "SHMEM allocation limit" warnings

### Production Redis Setup

For production, add password protection:

1. Edit `docker-compose.yml`:
   ```yaml
   redis:
     command: redis-server --appendonly yes --requirepass YOUR_STRONG_PASSWORD
   ```

2. Update environment:
   ```yaml
   backend:
     environment:
       - REDIS_URL=redis://:YOUR_STRONG_PASSWORD@redis:6379/0

   celery_worker:
     environment:
       - REDIS_URL=redis://:YOUR_STRONG_PASSWORD@redis:6379/0
   ```

---

## 📈 Performance Tuning

### Database Optimization

For better performance with many jobs:

```bash
# Inside backend container
docker exec -it whisper_backend bash
sqlite3 /app/data/whisper.db

# Create index on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_archived ON jobs(archived);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
```

### Redis Memory Limit

Add memory limit to Redis in `docker-compose.yml`:
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 🔄 Backup & Restore

### Backup Database
```bash
# Backup SQLite database
docker cp whisper_backend:/app/data/whisper.db ./backup-$(date +%Y%m%d).db

# Backup Redis data
docker exec whisper_redis redis-cli SAVE
docker cp whisper_redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Restore Database
```bash
# Restore SQLite
docker cp ./backup-20250101.db whisper_backend:/app/data/whisper.db
docker-compose restart backend celery_worker

# Restore Redis
docker-compose stop redis
docker cp ./redis-backup-20250101.rdb whisper_redis:/data/dump.rdb
docker-compose start redis
```

---

## 🧹 Cleanup

### Remove Old Jobs
```bash
docker exec -it whisper_backend bash
python << EOF
from database import SessionLocal, Job
from datetime import datetime, timedelta

db = SessionLocal()
cutoff = datetime.utcnow() - timedelta(days=30)
old_jobs = db.query(Job).filter(Job.created_at < cutoff, Job.archived == 1).all()
for job in old_jobs:
    db.delete(job)
db.commit()
print(f"Deleted {len(old_jobs)} old jobs")
EOF
```

### Clear Redis Queue
```bash
docker exec -it whisper_redis redis-cli FLUSHDB
```

### Prune Docker Volumes
```bash
docker volume prune
```

---

## 📞 Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md)
3. Check [Troubleshooting](#-troubleshooting) section above
4. Open GitHub issue with:
   - Error logs
   - Docker version: `docker --version`
   - GPU info: `nvidia-smi`

---

## 🎯 Next Steps

After successful deployment:

1. **Test parallel processing**:
   - Upload 3-4 audio files
   - Submit multiple transcribe jobs
   - Verify concurrent processing in logs

2. **Test archive functionality**:
   - Complete a transcription
   - Archive the job
   - Check Archive tab
   - Restore the job

3. **Monitor performance**:
   ```bash
   # Watch GPU usage
   watch -n 1 nvidia-smi

   # Monitor logs
   docker-compose logs -f celery_worker
   ```

4. **Configure Gemini API** (for enhancement):
   - Get API key from https://makersuite.google.com/app/apikey
   - Add to `.env`: `GEMINI_API_KEY=your_key_here`
   - Restart services

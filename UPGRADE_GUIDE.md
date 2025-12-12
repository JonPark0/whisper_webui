# Whisper WebUI Upgrade Guide

## Overview

This upgrade introduces significant improvements to the Whisper WebUI:

### ✨ New Features

1. **Parallel Processing with Celery**
   - Multiple transcription jobs can now run simultaneously
   - Non-blocking UI - you can use other features while transcription is running
   - Worker-based architecture with Redis message broker

2. **Archive System**
   - New "Archive" tab to manage completed jobs
   - Move completed jobs to archive to declutter main views
   - Restore archived jobs back to active status

3. **Enhanced Job Management**
   - Table view with sorting and filtering
   - Real-time search across all job fields
   - Improved visual feedback for job status

4. **Security Improvements**
   - All services now run as non-root user (UID 1000)
   - Eliminated Celery superuser privilege warning
   - Enhanced container security posture

### 🔧 Technical Changes

#### Backend
- Added **Celery** for distributed task processing
- Added **Redis** as message broker and result backend
- New API endpoints: `/api/jobs/{id}/archive` and `/api/jobs/{id}/unarchive`
- Database schema update: added `archived` field to jobs table

#### Frontend
- Added **TanStack Table** (React Table v8) for advanced table features
- New Archive page component
- Enhanced API service with archive/unarchive functions
- Improved job listing with search and sort capabilities

---

## Migration Steps

### Step 1: Database Migration

Run the database migration script to add the `archived` field:

```bash
cd whisper_webui/backend
python migrate_add_archived.py
```

**Expected Output:**
```
Adding 'archived' column to jobs table...
✓ Migration completed successfully!
```

### Step 2: Install Backend Dependencies

```bash
cd whisper_webui/backend
pip install -r requirements.txt
```

**New dependencies:**
- `celery>=5.3.0,<6.0.0`
- `redis>=5.0.0,<6.0.0`

### Step 3: Install Frontend Dependencies

```bash
cd whisper_webui/frontend
npm install
```

**New dependency:**
- `@tanstack/react-table@^8.20.0`

### Step 4: Environment Variables

Update your `.env` file (optional - defaults are provided):

```env
# Redis Configuration (Celery backend)
REDIS_URL=redis://redis:6379/0
```

### Step 5: Fix Volume Permissions

Since services now run as non-root user (UID 1000), fix volume permissions:

```bash
cd whisper_webui
./fix-permissions.sh
```

**What it does:**
- Changes ownership of backend directory to UID 1000
- Fixes Docker volume permissions
- Ensures Celery worker can write to volumes

### Step 6: Start Services with Docker Compose

The new architecture requires Redis and Celery worker services:

```bash
cd whisper_webui
docker-compose up --build
```

**New services:**
- `redis` - Message broker and result backend
- `celery_worker` - Background worker for processing jobs (2 concurrent workers)

**Security Note:** All services now run as non-root user (UID 1000) for enhanced security.

---

## Service Architecture

### Before Upgrade
```
┌─────────┐
│ Backend │ ──> Sequential processing (blocking)
│ (FastAPI│
└─────────┘
```

### After Upgrade
```
┌─────────┐      ┌───────┐      ┌────────────────┐
│ Backend │ ───> │ Redis │ <─── │ Celery Worker  │
│ (FastAPI│      │ Queue │      │ (2 concurrent) │
└─────────┘      └───────┘      └────────────────┘
   (API)          (Broker)       (Job Processing)
```

---

## Usage Guide

### Parallel Transcription

**Before:** Only one transcription could run at a time, blocking all UI interactions.

**Now:**
1. Submit multiple transcription jobs
2. All jobs are queued in Redis
3. Up to 2 workers process jobs concurrently
4. UI remains responsive - you can:
   - Upload more files
   - Create enhancement jobs
   - View completed transcripts
   - Archive old jobs

### Archive Management

#### Moving Jobs to Archive

1. Go to **Transcribe** or **Enhance** tab
2. Find completed jobs in the table
3. Click the **Archive** icon (📦) next to the job
4. Job moves to Archive tab and disappears from current view

#### Restoring from Archive

1. Go to **Archive** tab
2. Find the job you want to restore
3. Click the **Restore** icon (↩️)
4. Job returns to its original tab

#### Benefits
- Cleaner main views with only active/recent jobs
- Easy access to historical transcripts
- Permanent deletion only from Archive tab

---

## Configuration

### Adjusting Concurrent Workers

Edit [docker-compose.yml](docker-compose.yml#L45):

```yaml
celery_worker:
  command: celery -A celery_app worker --loglevel=info --concurrency=2
  #                                                     Change here ^^^
```

**Recommendations:**
- **2 workers** (default): Balanced for single GPU
- **1 worker**: For limited GPU memory
- **3-4 workers**: For powerful GPUs with 24GB+ VRAM

### Redis Configuration

**Development (default):**
```yaml
redis:
  command: redis-server --appendonly yes
```

**Production:**
```yaml
redis:
  command: redis-server --appendonly yes --requirepass YOUR_PASSWORD
environment:
  - REDIS_URL=redis://:YOUR_PASSWORD@redis:6379/0
```

---

## Monitoring

### Check Celery Worker Status

```bash
docker logs whisper_celery_worker -f
```

**Healthy output:**
```
[INFO] Starting transcription job 5
[INFO] Completed transcription job 5
```

### Check Redis Queue

```bash
docker exec -it whisper_redis redis-cli
> LLEN celery
(integer) 2  # Number of pending tasks
```

### Check Active Jobs

Frontend automatically polls `/api/jobs` every 5 seconds to update job status in real-time.

---

## Troubleshooting

### Issue: Celery worker not starting

**Symptoms:** Jobs stay in "pending" status forever

**Solution:**
```bash
docker logs whisper_celery_worker
# Check for import errors or missing dependencies
docker-compose restart celery_worker
```

### Issue: Redis connection refused

**Symptoms:** Error: `ConnectionRefusedError: [Errno 111] Connection refused`

**Solution:**
```bash
docker ps | grep redis  # Ensure Redis is running
docker-compose restart redis backend celery_worker
```

### Issue: Jobs fail immediately

**Symptoms:** Jobs go straight to "failed" status

**Solution:**
```bash
# Check worker logs for detailed error
docker logs whisper_celery_worker --tail=50

# Common causes:
# - Missing audio file
# - GPU out of memory
# - Invalid Gemini API key (for enhancement)
```

### Issue: Table not showing jobs

**Symptoms:** Frontend shows empty table despite jobs existing

**Solution:**
1. Check browser console for errors
2. Verify API connectivity: `curl http://localhost:8000/api/jobs`
3. Clear browser cache and refresh
4. Check archived filter: `archived=0` for active, `archived=1` for archive

---

## Rollback Procedure

If you need to rollback to the previous version:

1. **Stop services:**
   ```bash
   docker-compose down
   ```

2. **Checkout previous git commit:**
   ```bash
   git log --oneline  # Find commit before upgrade
   git checkout <commit-hash>
   ```

3. **Rebuild and restart:**
   ```bash
   docker-compose up --build
   ```

4. **Database:** The `archived` field won't break old code (defaults to 0)

---

## Performance Improvements

### Transcription Throughput

**Before Upgrade:**
- 1 job at a time
- ~5-10 minutes per job (depends on audio length)
- Total time for 10 jobs: 50-100 minutes

**After Upgrade:**
- 2 concurrent jobs (default)
- ~5-10 minutes per job
- Total time for 10 jobs: 25-50 minutes (**50% faster**)

### UI Responsiveness

**Before Upgrade:**
- UI freezes during transcription
- Cannot upload files
- Cannot view results

**After Upgrade:**
- Fully responsive at all times
- Upload while transcribing
- View results while other jobs process
- Archive management works immediately

---

## API Changes

### New Endpoints

#### Archive Job
```http
PUT /api/jobs/{job_id}/archive
```

**Response:**
```json
{
  "id": 5,
  "archived": 1,
  ...
}
```

#### Unarchive Job
```http
PUT /api/jobs/{job_id}/unarchive
```

**Response:**
```json
{
  "id": 5,
  "archived": 0,
  ...
}
```

### Modified Endpoints

#### List Jobs
```http
GET /api/jobs?archived=0  # Active jobs only
GET /api/jobs?archived=1  # Archived jobs only
GET /api/jobs             # All jobs
```

### Removed Dependencies

- `BackgroundTasks` (FastAPI) - Replaced by Celery
- `ThreadPoolExecutor` - Replaced by multi-process workers

---

## Security Considerations

### Redis Security

**Development:** No password (safe for local Docker network)

**Production:** Always set password:
```env
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379/0
```

### Celery Task Serialization

- Uses JSON serialization (secure)
- No `pickle` (prevents code injection)
- Tasks validated before execution

---

## Support

For issues or questions:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review Docker logs: `docker-compose logs -f`
- Open GitHub issue with:
  - Error logs
  - Docker Compose version
  - GPU details (if applicable)

---

## What's Next?

Future improvements on the roadmap:
- [ ] WebSocket for real-time updates (replace polling)
- [ ] Bulk operations (archive/delete multiple jobs)
- [ ] Job priority system
- [ ] Export job history to CSV
- [ ] Celery Flower dashboard for monitoring

# Architecture Overview

## System Architecture

Whisper WebUI is a full-stack web application for audio transcription and enhancement, built with modern technologies and best practices.

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                    (http://localhost:5173)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transcribe   │  │  Enhance     │  │   Archive    │      │
│  │    Page      │  │    Page      │  │    Page      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             API Endpoints                            │   │
│  │  • /api/upload      • /api/jobs                      │   │
│  │  • /api/transcribe  • /api/enhance                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         SQLite Database (Job Management)             │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Celery Tasks
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis (Message Broker)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Celery Worker (Background Processing)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Whisper Transcribe Service                          │   │
│  │  • Audio loading and preprocessing                   │   │
│  │  • Whisper model inference (GPU/CPU)                 │   │
│  │  • Timestamp generation                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Gemini Enhancement Service                          │   │
│  │  • Transcript improvement with AI                    │   │
│  │  • Translation support                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (Vite + React + TailwindCSS)

**Location:** `/frontend`

**Responsibilities:**
- User interface for file upload and transcription
- Real-time job status monitoring
- Audio player with timestamp synchronization
- Transcript viewing and downloading

**Key Technologies:**
- **Vite**: Fast build tool and dev server
- **React**: UI component framework
- **TailwindCSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication

**Main Pages:**
- `TranscribePage`: Audio upload and transcription
- `EnhancePage`: Transcript enhancement with AI
- `ArchivePage`: Job history and management

### 2. Backend (FastAPI + Python)

**Location:** `/backend`

**Responsibilities:**
- REST API server
- File upload and validation
- Job queue management
- Database operations
- CORS and security middleware

**Key Technologies:**
- **FastAPI**: Modern web framework
- **SQLAlchemy**: ORM for database
- **Pydantic**: Data validation
- **Celery**: Distributed task queue

**Main Modules:**
- `main.py`: API endpoints and app initialization
- `config.py`: Configuration management
- `database.py`: Database models and session
- `schemas.py`: Pydantic models for validation
- `celery_app.py`: Celery application setup
- `celery_tasks.py`: Background task definitions
- `whisper_service.py`: Whisper inference wrapper

### 3. Celery Worker

**Container:** `whisper_celery_worker`

**Responsibilities:**
- Process transcription jobs asynchronously
- Run Whisper model inference
- Call Gemini API for enhancement
- Update job status in database

**Features:**
- GPU support for faster processing
- Solo pool mode for reliability
- Automatic retry on failure
- Progress tracking

### 4. Redis

**Container:** `whisper_redis`

**Responsibilities:**
- Message broker for Celery
- Task queue storage
- Result backend

### 5. Database (SQLite)

**Location:** `/app/data/whisper.db`

**Schema:**
- **jobs** table: Stores all transcription and enhancement jobs
  - Job metadata (type, status, timestamps)
  - Input/output file paths
  - Processing options
  - Error messages

## Data Flow

### Transcription Flow

1. **Upload Audio**
   - User uploads audio file via frontend
   - Frontend sends file to `/api/upload`
   - Backend validates file (size, type, MIME)
   - Backend saves file with unique filename
   - Returns file metadata to frontend

2. **Create Transcription Job**
   - User configures options and submits
   - Frontend sends request to `/api/transcribe`
   - Backend creates job record in database
   - Backend submits task to Celery via Redis
   - Returns job ID to frontend

3. **Process Transcription**
   - Celery worker picks up task from queue
   - Loads audio file and Whisper model
   - Runs inference with configured options
   - Generates transcript with timestamps
   - Saves output as Markdown file
   - Updates job status in database

4. **Monitor and View Results**
   - Frontend polls `/api/jobs/{id}` for status
   - When completed, fetches `/api/jobs/{id}/result`
   - Displays transcript with audio player
   - User can download result

### Enhancement Flow

1. **Select Completed Transcript**
   - User browses completed transcription jobs
   - Selects job to enhance

2. **Create Enhancement Job**
   - User provides enhancement prompt
   - Frontend sends request to `/api/enhance`
   - Backend creates enhancement job
   - Backend submits task to Celery
   - Returns job ID to frontend

3. **Process Enhancement**
   - Celery worker picks up task
   - Loads original transcript
   - Calls Gemini API with prompt
   - Processes and formats response
   - Saves enhanced transcript
   - Updates job status

4. **View Enhanced Results**
   - Frontend displays enhanced transcript
   - User can compare with original

## Storage Architecture

### Volumes

- **uploads**: User-uploaded audio files
- **outputs**: Generated transcripts (Markdown)
- **models**: Cached AI models (Whisper, etc.)
- **data**: SQLite database file
- **redis_data**: Redis persistence

### File Naming

- Uploaded files: `{original_name}_{uuid8}.{ext}`
- Output files: `transcript_{job_id}_{timestamp}.md`

## Security Architecture

See [Security Guide](security.md) for detailed information.

**Key Security Features:**
- CORS protection with configurable origins
- File validation (extension, MIME type, size)
- Path traversal prevention
- UUID-based unique filenames
- Non-root container users
- Structured logging for audit

## Scalability Considerations

### Current Architecture
- Single Celery worker (solo pool)
- SQLite database
- Local file storage

### Scaling Options

**Horizontal Scaling:**
- Multiple Celery workers for parallel processing
- Load balancer for FastAPI instances
- Shared storage (NFS, S3) for files

**Database Scaling:**
- PostgreSQL for production
- Read replicas for queries
- Connection pooling

**Storage Scaling:**
- Object storage (S3, MinIO)
- CDN for static files
- Distributed file system

## Performance Optimization

### Backend
- Async file operations with `aiofiles`
- Database connection pooling
- Response caching for static data
- Efficient query optimization

### Worker
- GPU acceleration for Whisper
- Flash Attention 2 support
- Model caching
- Batch processing support

### Frontend
- Code splitting and lazy loading
- Asset optimization
- Service worker for caching
- WebSocket for real-time updates (future)

## Monitoring and Observability

### Logging
- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Contextual information in logs

### Metrics (Future Enhancement)
- Job processing time
- Queue length
- Error rates
- API response times

### Health Checks
- `/` endpoint for backend health
- Database connectivity check
- Redis connectivity check

## Development vs. Production

### Development Mode
- Hot reload enabled (`RELOAD_MODE=true`)
- Verbose logging (`LOG_LEVEL=DEBUG`)
- Frontend proxy to backend
- Source code mounted as volumes

### Production Mode
- No auto-reload
- INFO/WARNING logging
- Pre-built Docker images
- Persistent volumes only
- HTTPS termination (reverse proxy)

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | Vite + React | Latest |
| CSS Framework | TailwindCSS | Latest |
| Backend Framework | FastAPI | 0.109+ |
| Task Queue | Celery + Redis | 5.3+ |
| Database | SQLite | 3.x |
| AI Models | Whisper (HF) + Gemini | Latest |
| Container Runtime | Docker Compose | Latest |
| Python Runtime | Python | 3.11+ |
| Node Runtime | Node.js | 20+ |

## Next Steps

- [Development Guide](development.md) - Start developing
- [API Documentation](api.md) - Explore API endpoints
- [Deployment Guide](deployment.md) - Deploy to production

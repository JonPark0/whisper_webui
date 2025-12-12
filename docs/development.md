# Development Guide

Complete guide for setting up and developing Whisper WebUI.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [Code Structure](#code-structure)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Prerequisites

### Required Software

- **Docker** (20.10+) and **Docker Compose** (2.0+)
- **Git** (2.30+)
- **Python** (3.11+) - for local backend development
- **Node.js** (20+) and **npm** - for local frontend development
- **CUDA Toolkit** (optional, for GPU acceleration)

### Recommended Tools

- **VS Code** with extensions:
  - Python
  - ESLint
  - Prettier
  - Docker
  - TailwindCSS IntelliSense
- **Postman** or **Insomnia** - for API testing
- **Redis Insight** - for Redis debugging

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/whisper_webui.git
cd whisper_webui
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# Required
GEMINI_API_KEY=your-actual-api-key-here

# Development settings
RELOAD_MODE=true
LOG_LEVEL=DEBUG
BACKEND_PORT=8000
FRONTEND_PORT=5173

# CORS for development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Backend Docs: http://localhost:8000/docs (Swagger UI)
- Redis: localhost:6379

## Development Workflow

### Docker Development (Recommended)

**Advantages:**
- Consistent environment
- All dependencies included
- GPU support pre-configured
- Hot reload enabled

**Workflow:**

1. Edit code in your editor
2. Changes auto-reload (backend and frontend)
3. Test in browser
4. Check logs: `docker-compose logs -f backend`

**Rebuilding:**

```bash
# Rebuild specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Local Backend Development

For faster iteration on backend code:

**Setup:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run:**

```bash
# Set environment variables
export GEMINI_API_KEY=your-key
export REDIS_URL=redis://localhost:6379/0

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Start Celery worker separately:**

```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

### Local Frontend Development

For faster frontend iteration:

**Setup:**

```bash
cd frontend
npm install
```

**Run:**

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Environment:**

Create `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

## Code Structure

### Backend Structure

```
backend/
├── main.py              # FastAPI app and endpoints
├── config.py            # Configuration and settings
├── database.py          # SQLAlchemy models and DB setup
├── schemas.py           # Pydantic models for validation
├── celery_app.py        # Celery application setup
├── celery_tasks.py      # Background task definitions
├── whisper_service.py   # Whisper inference wrapper
├── requirements.txt     # Python dependencies
└── Dockerfile           # Docker image definition
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx              # App entry point
│   ├── App.jsx               # Root component with routing
│   ├── pages/                # Page components
│   │   ├── TranscribePage.jsx
│   │   ├── EnhancePage.jsx
│   │   └── ArchivePage.jsx
│   ├── components/           # Reusable components
│   │   ├── AudioUploader.jsx
│   │   ├── TranscriptViewer.jsx
│   │   └── JobQueue.jsx
│   ├── hooks/                # Custom React hooks
│   │   └── useJobs.js
│   ├── services/             # API client
│   │   └── api.js
│   └── index.css             # Global styles
├── package.json              # Node dependencies
├── vite.config.js            # Vite configuration
└── Dockerfile                # Docker image definition
```

### Key Files to Know

**Backend:**
- `main.py` - Add new API endpoints here
- `celery_tasks.py` - Add new background tasks
- `schemas.py` - Define request/response models
- `database.py` - Modify database schema

**Frontend:**
- `src/services/api.js` - API client functions
- `src/pages/*` - Main application pages
- `src/components/*` - Reusable UI components
- `src/hooks/useJobs.js` - Job polling logic

## Testing

### Backend Testing

**Setup:**

```bash
cd backend
pip install pytest pytest-asyncio httpx
```

**Run tests:**

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test
pytest tests/test_api.py::test_upload_file
```

**Test structure:**

```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

### Frontend Testing

**Setup:**

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Run tests:**

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Integration Testing

**Test with Docker:**

```bash
# Start services
docker-compose up -d

# Run integration tests
pytest tests/integration/

# Cleanup
docker-compose down
```

### Manual Testing

**API Testing with curl:**

```bash
# Upload file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test_audio.mp3"

# Create job
curl -X POST "http://localhost:8000/api/transcribe?filename=test_audio.mp3" \
  -H "Content-Type: application/json" \
  -d '{"enable_timestamp": true}'

# Check status
curl http://localhost:8000/api/jobs/1
```

**API Testing with Swagger:**

Visit http://localhost:8000/docs for interactive API documentation.

## Debugging

### Backend Debugging

**Docker Logs:**

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Last 100 lines
docker-compose logs --tail=100 backend
```

**VS Code Debugger:**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
      ],
      "jinja": true,
      "justMyCode": true,
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

**Add breakpoints:**

```python
# In your code
import pdb; pdb.set_trace()  # Breakpoint
```

### Frontend Debugging

**Browser DevTools:**
- Console: Check for errors and logs
- Network: Monitor API requests
- React DevTools: Inspect component state

**VS Code Debugger:**

```json
{
  "name": "Frontend: Chrome",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

### Database Debugging

**Access SQLite database:**

```bash
# Enter backend container
docker-compose exec backend bash

# Open database
sqlite3 /app/data/whisper.db

# Run queries
sqlite> SELECT * FROM jobs;
sqlite> .schema jobs
```

**VS Code SQLite extension:**
- Install "SQLite" extension
- Open `/app/data/whisper.db` from container volume

### Redis Debugging

**Redis CLI:**

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List keys
> KEYS *

# Get value
> GET celery-task-meta-<task-id>

# Monitor commands
> MONITOR
```

## Code Quality

### Python Code Style

**Tools:**
- **Black**: Code formatter
- **isort**: Import sorter
- **Flake8**: Linter
- **mypy**: Type checker

**Usage:**

```bash
cd backend

# Format code
black *.py

# Sort imports
isort *.py

# Lint
flake8 --max-line-length=120 *.py

# Type check
mypy *.py
```

**Pre-commit hook:**

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd backend
black --check *.py
isort --check-only *.py
flake8 --max-line-length=120 *.py
```

### JavaScript Code Style

**Tools:**
- **ESLint**: Linter
- **Prettier**: Formatter

**Usage:**

```bash
cd frontend

# Lint
npm run lint

# Fix issues
npm run lint -- --fix

# Format
npm run format
```

**Add scripts to `package.json`:**

```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx",
    "format": "prettier --write src/**/*.{js,jsx,css}"
  }
}
```

## Performance Profiling

### Backend Profiling

**Profile with cProfile:**

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Your code here

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats()
```

### Frontend Profiling

**React DevTools Profiler:**
1. Install React DevTools extension
2. Open Profiler tab
3. Record interaction
4. Analyze render times

## Contributing

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add timestamp support to transcription
fix: resolve audio upload validation issue
docs: update API documentation
refactor: simplify job status checking
test: add unit tests for file validation
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Push branch and create PR
4. Ensure CI/CD checks pass
5. Request review
6. Merge after approval

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Error handling implemented
- [ ] Logging added where appropriate

## Common Issues

### Issue: "Permission denied" in Docker

**Solution:**

```bash
# Run fix-permissions script
./fix-permissions.sh

# Or manually fix
sudo chown -R $USER:$USER .
```

### Issue: GPU not detected

**Solution:**

```bash
# Check NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# Verify docker-compose config
docker-compose config | grep -A 5 "devices"
```

### Issue: Port already in use

**Solution:**

```bash
# Change ports in .env
BACKEND_PORT=8001
FRONTEND_PORT=5174

# Restart services
docker-compose down
docker-compose up -d
```

### Issue: Hot reload not working

**Solution:**

```bash
# Ensure RELOAD_MODE is true
echo "RELOAD_MODE=true" >> .env

# Rebuild and restart
docker-compose up -d --build
```

## Next Steps

- [API Documentation](api.md) - Learn the API
- [Architecture Overview](architecture.md) - Understand the system
- [Deployment Guide](deployment.md) - Deploy to production

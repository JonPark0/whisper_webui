# Whisper WebUI Setup Guide

Complete guide for setting up and running the Whisper WebUI project.

## Prerequisites

- Docker & Docker Compose
- Git (optional, for cloning)
- 4GB+ RAM
- 10GB+ disk space
- Optional: NVIDIA GPU with CUDA support for faster processing

## Quick Start

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cd whisper_webui
cp .env.example .env
```

Edit the `.env` file and set your Gemini API key:

```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

To get a Gemini API key:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### 2. Start the Services

Using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Build and start the backend service
- Build and start the frontend service
- Download the Whisper model (~3GB, first run only)
- Set up all necessary volumes and networks

### 3. Access the Application

Once the services are running:

- **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Development Setup

If you want to run the services locally for development:

### Backend Development

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY='your-api-key'

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
export VITE_API_URL=http://localhost:8000

# Run development server
npm run dev
```

## Configuration Options

### Environment Variables

Edit `.env` to customize:

```env
# Required
GEMINI_API_KEY=your-gemini-api-key

# Optional - Whisper Model
WHISPER_MODEL=openai/whisper-large-v3-turbo

# Optional - Ports
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Optional - File Upload
MAX_FILE_SIZE=500MB

# Optional - Processing
DEFAULT_TIMEOUT=3600
ENABLE_FLASH_ATTENTION=false  # Set to true if you have compatible GPU
```

### GPU Support

If you have an NVIDIA GPU:

1. Install [nvidia-docker2](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

2. The docker-compose.yml is already configured to use GPU

3. Optionally enable Flash Attention in `.env`:
   ```env
   ENABLE_FLASH_ATTENTION=true
   ```

## Troubleshooting

### Services won't start

Check Docker logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Backend fails with "GEMINI_API_KEY not set"

Make sure your `.env` file has the correct API key and restart:
```bash
docker-compose down
docker-compose up -d
```

### File upload fails

Check `MAX_FILE_SIZE` in `.env` and ensure it's large enough for your audio files.

### Model download is slow

First run downloads ~3GB model. This is normal and only happens once. The model is cached in a Docker volume.

### GPU not being used

Verify:
1. nvidia-docker2 is installed
2. `nvidia-smi` works on host
3. Check docker-compose logs for GPU detection

## Stopping the Services

```bash
docker-compose down
```

To remove all data (including uploaded files and models):
```bash
docker-compose down -v
```

## Updating

Pull latest changes and rebuild:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Production Deployment

For production deployment:

1. Set secure environment variables
2. Configure proper CORS origins in `backend/main.py`
3. Use a reverse proxy (nginx, traefik) for HTTPS
4. Set appropriate resource limits in docker-compose.yml
5. Regular backups of the data volume

Example nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 500M;
    }
}
```

## Support

For issues and questions:
- Check existing issues in the repository
- Create a new issue with detailed information
- Include logs and error messages

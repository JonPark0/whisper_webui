# Whisper WebUI

A web-based interface for [Whisper Transcribe](../whisper_transcribe), providing easy-to-use audio transcription and text enhancement features.

## Features

- **Transcribe Tab**: Convert audio files to text using OpenAI Whisper
  - Audio file upload with preview
  - Start/End time selection with sliders
  - Real-time progress tracking
  - Interactive transcript viewer with audio synchronization
  - Click text segments to jump to audio timestamp
  - Auto-highlight text as audio plays

- **Enhance Tab**: Improve transcripts using Gemini API
  - Process completed transcriptions
  - Customizable enhancement prompts
  - Queue-based background processing

- **Transcript Viewer**: Interactive result viewing
  - Timestamp-synced audio player
  - Click any text to jump to that moment in audio
  - Auto-scroll and highlight current segment
  - Download results as Markdown

## Tech Stack

- **Frontend**: Vite + TailwindCSS
- **Backend**: FastAPI + Python
- **AI Models**: OpenAI Whisper + Google Gemini
- **Infrastructure**: Docker Compose

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your-actual-api-key
   ```

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Open your browser:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## Configuration

All configuration is done via the `.env` file. See [.env.example](.env.example) for available options.

### Required Configuration
- `GEMINI_API_KEY`: Your Google Gemini API key (get it from [Google AI Studio](https://aistudio.google.com/))

### Optional Configuration

**AI Models:**
- `WHISPER_MODEL`: Whisper model to use (default: `openai/whisper-large-v3-turbo`)
- `ENABLE_FLASH_ATTENTION`: Enable Flash Attention 2 for faster GPU processing (default: `false`)

**Server Settings:**
- `BACKEND_PORT`: Backend server port (default: `8000`)
- `FRONTEND_PORT`: Frontend server port (default: `5173`)
- `RELOAD_MODE`: Enable auto-reload for development (default: `true`)

**Security:**
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: `http://localhost:5173`)
  - For development: `http://localhost:5173,http://localhost:3000`
  - For production: `https://yourdomain.com`

**File Handling:**
- `MAX_FILE_SIZE`: Maximum upload file size (default: `500MB`)
- `UPLOAD_DIR`: Directory for uploaded files (default: `/app/uploads`)
- `OUTPUT_DIR`: Directory for output files (default: `/app/outputs`)

**Logging:**
- `LOG_LEVEL`: Logging level - DEBUG, INFO, WARNING, ERROR (default: `INFO`)
- `LOG_FORMAT`: Log format - json or text (default: `json`)

## Security Features

This application includes several security enhancements:

- **CORS Protection**: Configurable allowed origins to prevent unauthorized access
- **File Validation**:
  - Extension validation for audio files
  - MIME type validation using magic bytes
  - File size limits
- **Path Traversal Prevention**: Filename sanitization to prevent directory traversal attacks
- **Unique File Naming**: UUID-based filenames to prevent collisions and overwrites
- **Thread-Safe Operations**: Singleton services with proper locking mechanisms
- **Structured Logging**: Comprehensive logging for monitoring and debugging

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## System Requirements

- Docker & Docker Compose
- 4GB+ RAM
- 10GB+ disk space (for models and data)
- Optional: CUDA-compatible GPU for faster processing

## License

MIT

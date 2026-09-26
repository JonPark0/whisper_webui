# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-09-25

### Changed
- **Qwen3-ASR long audio**: `QWEN_MAX_CHUNK_SEC` (default 60) makes qwen3_transcribe split
  audio at silences and decode the pieces in batches. Measured on an RTX 3060 6 GB with a
  12-minute file: previously CUDA OOM; now 14.5x realtime at 5.1 GB peak (batch 4, no
  timestamps). Timestamped jobs at batch 4 still need ~6.8 GB — use `PIPELINE_BATCH_SIZE=2`
  on 6 GB cards.
- **UI redesign** after the PALNARIUM reference (Figma "Transcribe WebUI — Design System",
  v2): Exo 2 / Anta / Pretendard (self-hosted, no CDN), monochrome ink accent with colour
  reserved for status, text-link navigation and row actions, split page layout, Light/Dark
  themes from one token set (CSS variables named after the Figma variables).
- **Transcript viewer** is a page (`/jobs/:id`) instead of a modal: sticky player,
  click-to-seek, follow-playback that pauses while you scroll, find-in-transcript,
  .md/.srt/.txt downloads, and live status while the job is still running.
- A custom Gemini prompt is appended to the default clean-up instructions instead of
  replacing them.

### Added
- Live stage messages ("Transcribed 46% of audio") and audio duration per job; existing
  SQLite databases get the new columns automatically at startup.
- `GET /api/stats`, `GET /api/jobs?q=` (file-name search), server-side pagination in the UI.
- Confirm dialog (native `<dialog>`) for destructive actions; inline alerts instead of
  `alert()`.

### Fixed
- `translate_to` was ignored end to end; translation now happens in the Gemini step,
  including English.
- Jobs created before touching any option were submitted without the options the UI showed
  (e.g. timestamps displayed ON but sent OFF).
- The UI claimed "Powered by OpenAI Whisper" and offered chunk settings the engines ignore.

## [2025-12-02]

### Added

#### Security Enhancements
- **CORS Configuration**: Added configurable CORS origins via `ALLOWED_ORIGINS` environment variable
  - Replaced wildcard `["*"]` with configurable origins
  - Default: `http://localhost:5173`
  - Supports comma-separated list of allowed origins

- **File Upload Security**:
  - MIME type validation using magic bytes (file signature detection)
  - Path traversal attack prevention with filename sanitization
  - UUID-based unique filenames to prevent collisions
  - File size validation before saving
  - Enhanced error messages for security issues

- **Logging System**:
  - Structured logging with configurable log levels
  - Replaced `print()` statements with proper `logger` calls
  - Log levels: DEBUG, INFO, WARNING, ERROR
  - Configurable log format (json/text)

- **Thread Safety**:
  - Added thread-safe lazy loading for WhisperService singleton
  - Double-check locking pattern for transcriber and enhancer initialization
  - Thread locks to prevent race conditions

#### Configuration
- Created `.env.example` with comprehensive configuration options
- Added `RELOAD_MODE` for development/production switching
- Added `ALLOWED_ORIGINS` for CORS configuration
- Added `LOG_LEVEL` and `LOG_FORMAT` for logging configuration
- Added `WHISPER_TRANSCRIBE_PATH` for configurable dependency path

#### Documentation
- Created `SECURITY.md` with security best practices
- Created `.gitignore` to protect sensitive files
- Updated `README.md` with security features and configuration details
- Added production deployment guidelines

### Changed

#### Backend Improvements
- **Database Session Management**:
  - Fixed background task DB session handling
  - Changed from `next(get_db())` to `SessionLocal()` for proper session management
  - Added proper error handling and session cleanup in background tasks

- **Error Handling**:
  - Enhanced error handling in background tasks
  - Better error messages for users
  - Comprehensive exception logging
  - Automatic job status updates on failures

- **File Processing**:
  - Read file content into memory before validation (prevents partial uploads)
  - Validate MIME type before saving to disk
  - Return unique filename to client for subsequent requests
  - Better file path validation

- **Dependencies**:
  - Added version constraints to all requirements (semantic versioning)
  - Format: `package>=min_version,<max_version`
  - Prevents breaking changes from automatic updates

#### Infrastructure
- **Dockerfile**:
  - Added conditional reload mode via `RELOAD_MODE` environment variable
  - Production mode: runs with 1 worker (no reload)
  - Development mode: runs with `--reload` flag
  - Better suited for production deployments

- **Docker Compose**:
  - Pass `RELOAD_MODE` environment variable to backend container
  - Better environment variable handling

### Fixed

- **Security Vulnerabilities**:
  - Fixed CORS allowing all origins
  - Fixed path traversal vulnerability in file uploads
  - Fixed missing MIME type validation
  - Fixed filename collision issues

- **Code Quality**:
  - Fixed incorrect DB session management in background tasks
  - Fixed hardcoded paths (replaced with settings)
  - Fixed lack of logging throughout application
  - Fixed non-thread-safe singleton service

- **Error Handling**:
  - Fixed background tasks not updating job status on errors
  - Fixed missing try-catch blocks
  - Fixed poor error messages

### Removed
- Removed wildcard CORS origins `["*"]`
- Removed hardcoded `/whisper_transcribe` path
- Removed `print()` statements in favor of proper logging

## Migration Guide

### For Existing Deployments

1. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your settings**:
   ```env
   GEMINI_API_KEY=your-api-key
   ALLOWED_ORIGINS=https://yourdomain.com
   RELOAD_MODE=false  # For production
   LOG_LEVEL=WARNING
   ```

3. **Rebuild containers**:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

4. **Verify logs**:
   ```bash
   docker-compose logs -f backend
   ```

### Breaking Changes

- **CORS Configuration**: If you were relying on wildcard CORS, you must now specify allowed origins in `ALLOWED_ORIGINS`
- **File Upload Response**: Upload endpoint now returns unique filename instead of original filename
- **Environment Variables**: Several new required/recommended environment variables added

### Backwards Compatibility

The application maintains backwards compatibility with existing data:
- Database schema unchanged
- Existing uploaded files remain accessible
- Output file format unchanged

## Future Improvements

Planned for future releases:

- [ ] Rate limiting for API endpoints
- [ ] User authentication and authorization
- [ ] Database migrations with Alembic
- [ ] Automated testing suite
- [ ] Performance monitoring and metrics
- [ ] Webhook support for job completion
- [ ] Batch processing capabilities
- [ ] API versioning
- [ ] OpenAPI/Swagger documentation enhancements
- [ ] Caching layer for repeated requests

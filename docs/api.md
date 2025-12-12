# API Documentation

Complete REST API reference for Whisper WebUI backend.

**Base URL:** `http://localhost:8000`

## Table of Contents

- [Authentication](#authentication)
- [File Upload](#file-upload)
- [Transcription](#transcription)
- [Enhancement](#enhancement)
- [Job Management](#job-management)
- [Error Handling](#error-handling)

## Authentication

Currently, the API does not require authentication. For production deployments, consider implementing:
- API keys
- OAuth 2.0
- JWT tokens

## File Upload

### Upload Audio File

Upload an audio file for transcription.

**Endpoint:** `POST /api/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field

**Supported Formats:**
- MP3 (.mp3)
- WAV (.wav)
- FLAC (.flac)
- AAC (.aac)
- OGG (.ogg)
- M4A (.m4a)
- WMA (.wma)

**Constraints:**
- Max file size: 500MB (configurable via `MAX_FILE_SIZE`)
- MIME type validation using magic bytes
- Filename sanitization for security

**Response:**
```json
{
  "filename": "audio_abc12345.mp3",
  "size": 12345678,
  "duration": 125.5
}
```

**Status Codes:**
- `200 OK`: File uploaded successfully
- `400 Bad Request`: Invalid file format, size, or MIME type
- `500 Internal Server Error`: Failed to save file

**Example:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@audio.mp3"
```

## Transcription

### Create Transcription Job

Create a new transcription job for an uploaded audio file.

**Endpoint:** `POST /api/transcribe?filename={filename}`

**Query Parameters:**
- `filename` (required): Name of uploaded file from `/api/upload`

**Request Body:**
```json
{
  "start_time": 0.0,
  "end_time": null,
  "enable_timestamp": true,
  "enable_chunked": false,
  "chunk_length": 30,
  "translate_to": null,
  "auto_enhance": false,
  "enhancement_prompt": ""
}
```

**Parameters:**
- `start_time` (float): Start time in seconds (default: 0.0)
- `end_time` (float|null): End time in seconds, null for full audio
- `enable_timestamp` (bool): Include timestamps in output
- `enable_chunked` (bool): Process in chunks
- `chunk_length` (int): Chunk length in seconds
- `translate_to` (string|null): Target language code (e.g., "en", "ko")
- `auto_enhance` (bool): Automatically enhance after transcription
- `enhancement_prompt` (string): Prompt for auto-enhancement

**Response:**
```json
{
  "id": 1,
  "job_type": "transcribe",
  "status": "pending",
  "input_file": "/app/uploads/audio_abc12345.mp3",
  "output_file": null,
  "error_message": null,
  "progress": 0,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00",
  "completed_at": null,
  "start_time": 0.0,
  "end_time": null,
  "enable_timestamp": true,
  "enable_chunked": false,
  "chunk_length": 30,
  "translate_to": null,
  "auto_enhance": false,
  "enhancement_prompt": "",
  "archived": false
}
```

**Status Codes:**
- `200 OK`: Job created successfully
- `404 Not Found`: File not found

**Example:**
```bash
curl -X POST "http://localhost:8000/api/transcribe?filename=audio_abc12345.mp3" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": 0.0,
    "end_time": null,
    "enable_timestamp": true,
    "enable_chunked": false,
    "chunk_length": 30
  }'
```

## Enhancement

### Create Enhancement Job

Enhance an existing transcript using Gemini AI.

**Endpoint:** `POST /api/enhance`

**Request Body:**
```json
{
  "job_id": 1,
  "enhancement_prompt": "Improve grammar and formatting",
  "translate_to": null
}
```

**Parameters:**
- `job_id` (int, required): ID of completed transcription job
- `enhancement_prompt` (string): Instructions for enhancement
- `translate_to` (string|null): Target language for translation

**Response:**
```json
{
  "id": 2,
  "job_type": "enhance",
  "status": "pending",
  "input_file": "/app/outputs/transcript_1_20240115.md",
  "output_file": null,
  "error_message": null,
  "progress": 0,
  "created_at": "2024-01-15T10:35:00",
  "updated_at": "2024-01-15T10:35:00",
  "enhancement_prompt": "Improve grammar and formatting",
  "translate_to": null
}
```

**Status Codes:**
- `200 OK`: Enhancement job created
- `400 Bad Request`: Source job not completed or transcript not found
- `404 Not Found`: Source job not found

**Example:**
```bash
curl -X POST http://localhost:8000/api/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "enhancement_prompt": "Clean up filler words and improve readability"
  }'
```

## Job Management

### List Jobs

Get a list of all jobs with optional filtering.

**Endpoint:** `GET /api/jobs`

**Query Parameters:**
- `job_type` (string): Filter by type (`transcribe` or `enhance`)
- `status` (string): Filter by status (`pending`, `processing`, `completed`, `failed`)
- `archived` (int): Filter by archive status (`0`=active, `1`=archived, omit for all)
- `limit` (int): Max results to return (default: 100)
- `offset` (int): Number of results to skip (default: 0)

**Response:**
```json
{
  "jobs": [
    {
      "id": 1,
      "job_type": "transcribe",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00",
      ...
    }
  ],
  "total": 42
}
```

**Example:**
```bash
# Get all active transcription jobs
curl "http://localhost:8000/api/jobs?job_type=transcribe&archived=0"

# Get failed jobs
curl "http://localhost:8000/api/jobs?status=failed"

# Pagination
curl "http://localhost:8000/api/jobs?limit=20&offset=40"
```

### Get Job Details

Get detailed information about a specific job.

**Endpoint:** `GET /api/jobs/{job_id}`

**Path Parameters:**
- `job_id` (int): Job ID

**Response:**
```json
{
  "id": 1,
  "job_type": "transcribe",
  "status": "completed",
  "input_file": "/app/uploads/audio_abc12345.mp3",
  "output_file": "/app/outputs/transcript_1_20240115.md",
  "progress": 100,
  "created_at": "2024-01-15T10:30:00",
  "completed_at": "2024-01-15T10:32:15",
  ...
}
```

**Status Codes:**
- `200 OK`: Job found
- `404 Not Found`: Job not found

### Get Job Result

Get the content of a completed job's output.

**Endpoint:** `GET /api/jobs/{job_id}/result`

**Response:**
```json
{
  "job_id": 1,
  "filename": "audio_abc12345.mp3",
  "audio_url": "/api/uploads/audio_abc12345.mp3",
  "content": "# Transcript\n\n[00:00:00] Hello world...",
  "has_timestamps": true
}
```

**Status Codes:**
- `200 OK`: Result retrieved
- `400 Bad Request`: Job not completed
- `404 Not Found`: Job or output file not found

### Download Job Result

Download the transcript file.

**Endpoint:** `GET /api/jobs/{job_id}/download`

**Response:**
- Content-Type: `text/markdown`
- Content-Disposition: `attachment; filename="transcript_1_20240115.md"`

**Status Codes:**
- `200 OK`: File download started
- `400 Bad Request`: Job not completed
- `404 Not Found`: Job or output file not found

**Example:**
```bash
curl -O -J http://localhost:8000/api/jobs/1/download
```

### Archive Job

Mark a job as archived (hidden from default view).

**Endpoint:** `PUT /api/jobs/{job_id}/archive`

**Response:**
```json
{
  "id": 1,
  "archived": true,
  ...
}
```

**Status Codes:**
- `200 OK`: Job archived
- `404 Not Found`: Job not found

### Unarchive Job

Remove archive status from a job.

**Endpoint:** `PUT /api/jobs/{job_id}/unarchive`

**Status Codes:**
- `200 OK`: Job unarchived
- `404 Not Found`: Job not found

### Delete Job

Delete a job and its associated files.

**Endpoint:** `DELETE /api/jobs/{job_id}`

**Response:**
```json
{
  "message": "Job deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Job deleted
- `404 Not Found`: Job not found

**Warning:** This operation is irreversible and will delete:
- Job record from database
- Output transcript file (if exists)
- Note: Original uploaded audio is NOT deleted

## Job Status Flow

Jobs go through the following status transitions:

```
pending → processing → completed
                    → failed
```

**Status Definitions:**

- **pending**: Job created, waiting for worker
- **processing**: Worker is processing the job
- **completed**: Job finished successfully
- **failed**: Job encountered an error

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid parameters, file format, or job state |
| 404 | Not Found | Job, file, or resource not found |
| 500 | Internal Server Error | Unexpected server error |

### Job Error Messages

When a job fails, check the `error_message` field:

```json
{
  "id": 1,
  "status": "failed",
  "error_message": "Failed to load audio file: File corrupted",
  ...
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production, consider:
- Per-IP rate limits
- Per-user quotas
- Queue size limits

## CORS

CORS is configured via `ALLOWED_ORIGINS` environment variable:

```bash
# Development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Production
ALLOWED_ORIGINS=https://yourdomain.com
```

## API Versioning

Currently using implicit v1 API. Future versions will use:
- URL path versioning: `/api/v2/...`
- Header versioning: `Accept: application/vnd.whisper.v2+json`

## SDK and Examples

### Python Example

```python
import requests

# Upload file
with open('audio.mp3', 'rb') as f:
    upload_response = requests.post(
        'http://localhost:8000/api/upload',
        files={'file': f}
    )
filename = upload_response.json()['filename']

# Create transcription job
transcribe_response = requests.post(
    f'http://localhost:8000/api/transcribe?filename={filename}',
    json={
        'enable_timestamp': True,
        'enable_chunked': False
    }
)
job_id = transcribe_response.json()['id']

# Poll for completion
import time
while True:
    job_response = requests.get(f'http://localhost:8000/api/jobs/{job_id}')
    job = job_response.json()

    if job['status'] == 'completed':
        # Get result
        result = requests.get(f'http://localhost:8000/api/jobs/{job_id}/result')
        print(result.json()['content'])
        break
    elif job['status'] == 'failed':
        print(f"Error: {job['error_message']}")
        break

    time.sleep(2)
```

### JavaScript Example

```javascript
// Upload file
const formData = new FormData();
formData.append('file', audioFile);

const uploadRes = await fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData
});
const { filename } = await uploadRes.json();

// Create transcription job
const transcribeRes = await fetch(
  `http://localhost:8000/api/transcribe?filename=${filename}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enable_timestamp: true,
      enable_chunked: false
    })
  }
);
const { id: jobId } = await transcribeRes.json();

// Poll for completion
const checkJob = async () => {
  const jobRes = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
  const job = await jobRes.json();

  if (job.status === 'completed') {
    const resultRes = await fetch(`http://localhost:8000/api/jobs/${jobId}/result`);
    const result = await resultRes.json();
    console.log(result.content);
  } else if (job.status === 'failed') {
    console.error(job.error_message);
  } else {
    setTimeout(checkJob, 2000);
  }
};

checkJob();
```

## WebSocket Support (Future)

Future versions may include WebSocket support for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/jobs/1');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`Progress: ${update.progress}%`);
};
```

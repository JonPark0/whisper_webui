from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import subprocess
import json
from typing import List

from config import settings
from database import get_db, Job, JobStatus, JobType
from schemas import (
    TranscribeRequest,
    EnhanceRequest,
    JobResponse,
    JobListResponse,
    UploadResponse
)
from whisper_service import whisper_service

app = FastAPI(title="Whisper WebUI API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded audio
app.mount("/api/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")


def get_audio_duration_fast(file_path: str) -> float:
    """
    Get audio duration using ffprobe (fast method)

    This reads metadata from the file header without loading the entire audio.
    Falls back to None if ffprobe is not available or fails.
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'json',
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)

        if result.returncode == 0:
            data = json.loads(result.stdout)
            duration = float(data['format']['duration'])
            return duration
    except (subprocess.TimeoutExpired, FileNotFoundError, KeyError, ValueError, json.JSONDecodeError) as e:
        print(f"[WARNING] Failed to get duration with ffprobe: {e}")

    return None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Whisper WebUI API is running",
        "version": "1.0.0"
    }


@app.post("/api/upload", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload audio file for processing

    Supported formats: MP3, WAV, FLAC, AAC, OGG, M4A, WMA
    """
    # Validate file extension
    allowed_extensions = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )

    # Save uploaded file
    file_path = settings.upload_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = file_path.stat().st_size

    # Check file size
    if file_size > settings.max_file_size_bytes:
        file_path.unlink()  # Delete the file
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size}"
        )

    # Get audio duration using fast ffprobe method
    duration = get_audio_duration_fast(str(file_path))

    return UploadResponse(
        filename=file.filename,
        size=file_size,
        duration=duration
    )


@app.post("/api/transcribe", response_model=JobResponse)
async def create_transcribe_job(
    filename: str,
    request: TranscribeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new transcription job

    The job will be processed in the background
    """
    # Verify file exists
    file_path = settings.upload_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Create job
    job = Job(
        job_type=JobType.TRANSCRIBE,
        status=JobStatus.PENDING,
        input_file=str(file_path),
        start_time=request.start_time,
        end_time=request.end_time,
        enable_timestamp=int(request.enable_timestamp),
        enable_chunked=int(request.enable_chunked),
        chunk_length=request.chunk_length,
        translate_to=request.translate_to,
        auto_enhance=int(request.auto_enhance),
        enhancement_prompt=request.enhancement_prompt
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Process in background
    background_tasks.add_task(process_transcribe_job, job.id)

    return JobResponse.from_orm(job)


@app.post("/api/enhance", response_model=JobResponse)
async def create_enhance_job(
    request: EnhanceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new enhancement job for an existing transcription

    The job will be processed in the background
    """
    # Get source job
    source_job = db.query(Job).filter(Job.id == request.job_id).first()

    if not source_job:
        raise HTTPException(status_code=404, detail="Source job not found")

    if source_job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Source job is not completed")

    if not source_job.output_file or not Path(source_job.output_file).exists():
        raise HTTPException(status_code=400, detail="Source transcript not found")

    # Create enhancement job
    job = Job(
        job_type=JobType.ENHANCE,
        status=JobStatus.PENDING,
        input_file=source_job.output_file,
        enhancement_prompt=request.enhancement_prompt,
        translate_to=request.translate_to
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Process in background
    background_tasks.add_task(process_enhance_job, job.id, request.job_id)

    return JobResponse.from_orm(job)


@app.get("/api/jobs", response_model=JobListResponse)
async def list_jobs(
    job_type: str = None,
    status: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List all jobs with optional filtering

    Query parameters:
    - job_type: Filter by job type (transcribe/enhance)
    - status: Filter by status (pending/processing/completed/failed)
    - limit: Maximum number of jobs to return
    - offset: Number of jobs to skip
    """
    query = db.query(Job)

    if job_type:
        query = query.filter(Job.job_type == job_type)

    if status:
        query = query.filter(Job.status == status)

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    return JobListResponse(
        jobs=[JobResponse.from_orm(job) for job in jobs],
        total=total
    )


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get job details by ID"""
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse.from_orm(job)


@app.get("/api/jobs/{job_id}/result")
async def get_result(job_id: int, db: Session = Depends(get_db)):
    """Get job result content as JSON"""
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job is not completed")

    if not job.output_file or not Path(job.output_file).exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    # Read the markdown file
    with open(job.output_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Get the audio filename from input_file path
    audio_filename = Path(job.input_file).name

    return {
        "job_id": job.id,
        "filename": audio_filename,
        "audio_url": f"/api/uploads/{audio_filename}",
        "content": content,
        "has_timestamps": bool(job.enable_timestamp)
    }


@app.get("/api/jobs/{job_id}/download")
async def download_result(job_id: int, db: Session = Depends(get_db)):
    """Download job result file"""
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job is not completed")

    if not job.output_file or not Path(job.output_file).exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        job.output_file,
        media_type="text/markdown",
        filename=Path(job.output_file).name
    )


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Delete a job and its associated files"""
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Delete output file if exists
    if job.output_file and Path(job.output_file).exists():
        Path(job.output_file).unlink()

    # Delete job from database
    db.delete(job)
    db.commit()

    return {"message": "Job deleted successfully"}


# Background task functions
async def process_transcribe_job(job_id: int):
    """Background task to process transcription job"""
    db = next(get_db())
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            await whisper_service.transcribe_audio(job, db)
    finally:
        db.close()


async def process_enhance_job(job_id: int, source_job_id: int):
    """Background task to process enhancement job"""
    db = next(get_db())
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        source_job = db.query(Job).filter(Job.id == source_job_id).first()
        if job and source_job:
            await whisper_service.enhance_job(job, source_job, db)
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.backend_host, port=settings.backend_port)

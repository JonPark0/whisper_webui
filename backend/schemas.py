from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from database import JobStatus, JobType


class TranscribeRequest(BaseModel):
    """Request model for transcription job"""
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    enable_timestamp: bool = False
    enable_chunked: bool = False
    chunk_length: int = 30
    translate_to: Optional[str] = None
    auto_enhance: bool = False
    enhancement_prompt: Optional[str] = None


class EnhanceRequest(BaseModel):
    """Request model for enhancement job"""
    job_id: int = Field(..., description="ID of the completed transcription job")
    enhancement_prompt: Optional[str] = None
    translate_to: Optional[str] = None


class JobResponse(BaseModel):
    """Response model for job information"""
    id: int
    job_type: JobType
    status: JobStatus
    input_file: str
    output_file: Optional[str]
    progress: float
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    # Options
    start_time: Optional[float]
    end_time: Optional[float]
    enable_timestamp: bool
    enable_chunked: bool
    chunk_length: int
    translate_to: Optional[str]
    enhancement_prompt: Optional[str]

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Response model for list of jobs"""
    jobs: list[JobResponse]
    total: int


class UploadResponse(BaseModel):
    """Response model for file upload"""
    filename: str
    size: int
    duration: Optional[float] = None

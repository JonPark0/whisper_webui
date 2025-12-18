"""
Celery application for handling background tasks (transcription and enhancement)
This enables true parallel processing of multiple jobs
"""
from celery import Celery
from config import settings

# Create Celery app
celery_app = Celery(
    "whisper_webui",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["celery_tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Process one task at a time per worker
    worker_max_tasks_per_child=3,  # Restart worker after 3 tasks to aggressively prevent memory leaks
    worker_pool="solo",  # Use solo pool to avoid multiprocessing issues with CUDA
)

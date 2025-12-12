"""
Celery tasks for background processing of transcription and enhancement jobs
Each task runs in a separate worker process for true parallelism
"""
import logging
from celery_app import celery_app
from database import SessionLocal, Job, JobStatus
from whisper_service import whisper_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.transcribe_audio")
def transcribe_audio_task(self, job_id: int):
    """
    Celery task for transcribing audio

    Args:
        job_id: ID of the job to process

    Returns:
        dict with job_id and status
    """
    db = SessionLocal()
    try:
        logger.info(f"[Celery Worker] Starting transcription job {job_id}")
        job = db.query(Job).filter(Job.id == job_id).first()

        if not job:
            logger.error(f"Job {job_id} not found")
            return {"job_id": job_id, "status": "error", "message": "Job not found"}

        # Process transcription (synchronous call in worker process)
        whisper_service.transcribe_audio_sync(job, db)

        logger.info(f"[Celery Worker] Completed transcription job {job_id}")
        return {"job_id": job_id, "status": "completed"}

    except Exception as e:
        logger.error(f"[Celery Worker] Error processing transcription job {job_id}: {e}")

        # Update job status to failed
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")

        return {"job_id": job_id, "status": "failed", "error": str(e)}

    finally:
        db.close()


@celery_app.task(bind=True, name="tasks.enhance_transcript")
def enhance_transcript_task(self, job_id: int, source_job_id: int):
    """
    Celery task for enhancing transcript

    Args:
        job_id: ID of the enhancement job
        source_job_id: ID of the source transcription job

    Returns:
        dict with job_id and status
    """
    db = SessionLocal()
    try:
        logger.info(f"[Celery Worker] Starting enhancement job {job_id}")
        job = db.query(Job).filter(Job.id == job_id).first()
        source_job = db.query(Job).filter(Job.id == source_job_id).first()

        if not job:
            logger.error(f"Enhancement job {job_id} not found")
            return {"job_id": job_id, "status": "error", "message": "Job not found"}

        if not source_job:
            logger.error(f"Source job {source_job_id} not found")
            return {"job_id": job_id, "status": "error", "message": "Source job not found"}

        # Process enhancement (synchronous call in worker process)
        whisper_service.enhance_job_sync(job, source_job, db)

        logger.info(f"[Celery Worker] Completed enhancement job {job_id}")
        return {"job_id": job_id, "status": "completed"}

    except Exception as e:
        logger.error(f"[Celery Worker] Error processing enhancement job {job_id}: {e}")

        # Update job status to failed
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")

        return {"job_id": job_id, "status": "failed", "error": str(e)}

    finally:
        db.close()

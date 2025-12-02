import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

# Add whisper_transcribe to Python path
sys.path.insert(0, '/whisper_transcribe')

from core.transcriber import WhisperTranscriber
from core.enhancer import TranscriptEnhancer
from config import settings
from database import Job, JobStatus, get_db


class WhisperService:
    """Service for handling Whisper transcription and enhancement"""

    def __init__(self):
        self.transcriber = None
        self.enhancer = None

    def _get_transcriber(self) -> WhisperTranscriber:
        """Lazy load transcriber"""
        if self.transcriber is None:
            # WhisperTranscriber uses hardcoded openai/whisper-large-v3-turbo model
            # Note: settings.whisper_model is ignored as the model is fixed in the transcriber
            self.transcriber = WhisperTranscriber(
                verbose=True,
                use_flash_attn=settings.enable_flash_attention
            )
            # Load model on initialization
            self.transcriber.load_model()
        return self.transcriber

    def _get_enhancer(self) -> TranscriptEnhancer:
        """Lazy load enhancer"""
        if self.enhancer is None:
            self.enhancer = TranscriptEnhancer(verbose=True)
            # Setup Gemini API with the API key
            self.enhancer.setup_gemini(settings.gemini_api_key)
        return self.enhancer

    async def transcribe_audio(self, job: Job, db_session) -> str:
        """
        Transcribe audio file

        Args:
            job: Job object containing transcription parameters
            db_session: Database session for updating progress

        Returns:
            Path to output markdown file
        """
        try:
            # Update job status
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.progress = 0.0
            db_session.commit()

            transcriber = self._get_transcriber()

            # Prepare input file path
            input_path = Path(job.input_file)

            # Progress callback for transcription
            def progress_update(update_data: dict):
                """Update job progress based on transcription stage"""
                stage = update_data.get('stage', '')
                progress = update_data.get('progress', 0)

                # Map transcription progress (0.1-1.0) to job progress (10%-80%)
                job_progress = 10.0 + (progress * 70.0)
                job.progress = job_progress
                db_session.commit()

            # Transcribe using the correct API
            transcribe_result = transcriber.transcribe_audio(
                audio_path=str(input_path),
                enable_timestamps=bool(job.enable_timestamp),
                start_time=job.start_time,
                end_time=job.end_time,
                progress_callback=progress_update
            )

            # Check if transcription was successful
            if not transcribe_result.get('success', False):
                error_msg = transcribe_result.get('error', 'Unknown transcription error')
                raise Exception(f"Transcription failed: {error_msg}")

            # Extract the text result
            result = transcribe_result['text']

            job.progress = 80.0
            db_session.commit()

            # Save to markdown file
            output_filename = f"{input_path.stem}_{job.id}.md"
            output_path = settings.output_dir / output_filename

            self._save_markdown(
                output_path=output_path,
                input_filename=input_path.name,
                content=result,
                timestamp_enabled=bool(job.enable_timestamp)
            )

            job.output_file = str(output_path)
            job.progress = 90.0
            db_session.commit()

            # Auto-enhance if requested
            if job.auto_enhance:
                enhanced_result = await self.enhance_transcript(
                    transcript=result,
                    prompt=job.enhancement_prompt,
                    translate_to=job.translate_to
                )

                # Save enhanced version
                enhanced_filename = f"{input_path.stem}_{job.id}_enhanced.md"
                enhanced_path = settings.output_dir / enhanced_filename

                self._save_markdown(
                    output_path=enhanced_path,
                    input_filename=input_path.name,
                    content=enhanced_result,
                    timestamp_enabled=bool(job.enable_timestamp),
                    enhanced=True
                )

                job.output_file = str(enhanced_path)

            job.progress = 100.0
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            db_session.commit()

            return job.output_file

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db_session.commit()
            raise

    async def enhance_transcript(
        self,
        transcript: str,
        prompt: Optional[str] = None,
        translate_to: Optional[str] = None
    ) -> str:
        """
        Enhance transcript using Gemini API

        Args:
            transcript: Original transcript text
            prompt: Custom enhancement prompt
            translate_to: Target language for translation

        Returns:
            Enhanced transcript text
        """
        enhancer = self._get_enhancer()

        # Call the correct API method
        result = enhancer.enhance_transcript(
            input_content=transcript,
            custom_prompt=prompt
        )

        # Check if enhancement was successful
        if not result.get('success', False):
            error_msg = result.get('error', 'Unknown enhancement error')
            raise Exception(f"Enhancement failed: {error_msg}")

        return result['enhanced_text']

    async def enhance_job(self, job: Job, source_job: Job, db_session) -> str:
        """
        Enhance an existing transcription job

        Args:
            job: Enhancement job object
            source_job: Original transcription job
            db_session: Database session

        Returns:
            Path to enhanced output file
        """
        try:
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.progress = 0.0
            db_session.commit()

            # Read original transcript
            with open(source_job.output_file, 'r', encoding='utf-8') as f:
                original_content = f.read()

            job.progress = 20.0
            db_session.commit()

            # Extract transcript content (skip markdown header)
            lines = original_content.split('\n')
            content_start = 0
            for i, line in enumerate(lines):
                if line.startswith('## Content'):
                    content_start = i + 1
                    break

            transcript_text = '\n'.join(lines[content_start:]).strip()

            job.progress = 30.0
            db_session.commit()

            # Enhance
            enhanced_text = await self.enhance_transcript(
                transcript=transcript_text,
                prompt=job.enhancement_prompt,
                translate_to=job.translate_to
            )

            job.progress = 80.0
            db_session.commit()

            # Save enhanced version
            input_path = Path(source_job.input_file)
            enhanced_filename = f"{input_path.stem}_{job.id}_enhanced.md"
            enhanced_path = settings.output_dir / enhanced_filename

            self._save_markdown(
                output_path=enhanced_path,
                input_filename=input_path.name,
                content=enhanced_text,
                timestamp_enabled=bool(source_job.enable_timestamp),
                enhanced=True
            )

            job.output_file = str(enhanced_path)
            job.progress = 100.0
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            db_session.commit()

            return job.output_file

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db_session.commit()
            raise

    def _save_markdown(
        self,
        output_path: Path,
        input_filename: str,
        content: str,
        timestamp_enabled: bool,
        enhanced: bool = False
    ):
        """Save transcript to markdown file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            title = "Enhanced Transcript" if enhanced else "Transcript"
            f.write(f"# {title}: {Path(input_filename).stem}\n\n")
            f.write(f"**Source:** {input_filename}\n\n")
            if timestamp_enabled:
                f.write("**Timestamps:** Enabled\n\n")
            if enhanced:
                f.write("**Enhanced:** Yes (Gemini API)\n\n")
            f.write("## Content\n\n")
            f.write(content)

    def get_audio_duration(self, file_path: str) -> float:
        """Get audio file duration in seconds"""
        transcriber = self._get_transcriber()
        # Load audio to get duration
        _, duration = transcriber.load_audio_segment(file_path)
        return duration


# Singleton instance
whisper_service = WhisperService()

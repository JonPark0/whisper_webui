from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
from config import settings

# Database setup
SQLALCHEMY_DATABASE_URL = f"sqlite:///{settings.db_path}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, enum.Enum):
    TRANSCRIBE = "transcribe"
    ENHANCE = "enhance"


class Job(Base):
    """Job model for tracking transcription and enhancement tasks"""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)

    # File information
    input_file = Column(String, nullable=False)
    output_file = Column(String, nullable=True)

    # Audio processing options
    start_time = Column(Float, nullable=True)
    end_time = Column(Float, nullable=True)
    enable_timestamp = Column(Integer, default=0)  # SQLite uses 0/1 for boolean
    enable_chunked = Column(Integer, default=0)
    chunk_length = Column(Integer, default=30)
    translate_to = Column(String, nullable=True)

    # Enhancement options
    enhancement_prompt = Column(Text, nullable=True)
    auto_enhance = Column(Integer, default=0)

    # Progress tracking
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    # Archive status
    archived = Column(Integer, default=0)  # 0=active, 1=archived

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


# Create tables
Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Use NVIDIA PyTorch base image (includes PyTorch, CUDA, Flash Attention 2, and Python 3.12)
FROM nvcr.io/nvidia/pytorch:25.09-py3

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install nvidia-ml-py to replace deprecated pynvml used by PyTorch
RUN pip install --no-cache-dir nvidia-ml-py

# Install Python dependencies
# Note: torch, flash-attn are already included in base image
RUN grep -v -E "^(torch|flash-attn|ninja|packaging)" requirements.txt > requirements-filtered.txt && \
    pip install --no-cache-dir -r requirements-filtered.txt

# Download Whisper model on build
RUN python -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    model_id = 'openai/whisper-large-v3-turbo'; \
    AutoModelForSpeechSeq2Seq.from_pretrained(model_id); \
    AutoProcessor.from_pretrained(model_id)"

# Clone whisper_transcribe repository
RUN git clone https://github.com/jonpark0/whisper_transcribe.git /whisper_transcribe

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/outputs /app/data

# The base image already has a user with UID 1000
# Check if user exists and get username, then change ownership
RUN existing_user=$(getent passwd 1000 | cut -d: -f1) && \
    if [ -n "$existing_user" ]; then \
        echo "Using existing user: $existing_user (UID 1000)"; \
        chown -R 1000:1000 /app; \
    else \
        echo "Creating new user: appuser (UID 1000)"; \
        groupadd -r appuser && useradd -r -g appuser -u 1000 appuser; \
        chown -R appuser:appuser /app; \
    fi

# Switch to non-root user (UID 1000)
USER 1000

# Expose port
EXPOSE 8000

# Environment variable to control reload mode
ENV RELOAD_MODE=false

# Run the application
# Use conditional reload based on environment
# For production: --workers 4 --worker-class uvicorn.workers.UvicornWorker
# For development: --reload
CMD if [ "$RELOAD_MODE" = "true" ]; then \
        uvicorn main:app --host 0.0.0.0 --port 8000 --reload; \
    else \
        uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1; \
    fi

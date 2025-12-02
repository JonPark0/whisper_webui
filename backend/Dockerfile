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

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/outputs /app/data

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

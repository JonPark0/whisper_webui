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

# Download Qwen3-ASR + forced aligner models on build.
# HF_HOME is redirected to a world-readable location because this stage runs
# as root but the container itself runs as USER 1000 (see below) - the
# default ~/.cache/huggingface would end up under /root and be unreadable at
# runtime, forcing a re-download on first job.
ENV HF_HOME=/opt/hf-cache
RUN python -c "from huggingface_hub import snapshot_download; \
    snapshot_download('Qwen/Qwen3-ASR-1.7B'); \
    snapshot_download('Qwen/Qwen3-ForcedAligner-0.6B')" && \
    chmod -R a+rX /opt/hf-cache

# Once models are baked in, stop huggingface_hub from touching the network or
# the (now read-only-to-UID-1000) cache directory at runtime. Without this,
# every model load tries to write cache-staleness markers (e.g. .no_exist)
# under /opt/hf-cache, which USER 1000 can't do (cache dir is owned by root
# from this build stage) - harmless but spams "Permission denied" in worker
# logs on every job. Offline mode also means the container works with no
# internet access and skips a remote HEAD-check round trip on every job.
ENV HF_HUB_OFFLINE=1

# Clone qwen3_transcribe repository
RUN git clone https://github.com/jonpark0/qwen3_transcribe.git /qwen3_transcribe

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

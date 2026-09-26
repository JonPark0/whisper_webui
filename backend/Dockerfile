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

# Download Whisper models on build (both engines, so STT_ENGINE can be
# switched without a rebuild). The CT2 model is a float16 conversion of the
# same openai/whisper-large-v3-turbo weights.
RUN python -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    model_id = 'openai/whisper-large-v3-turbo'; \
    AutoModelForSpeechSeq2Seq.from_pretrained(model_id); \
    AutoProcessor.from_pretrained(model_id)" && \
    python -c "from huggingface_hub import snapshot_download; \
    snapshot_download('deepdml/faster-whisper-large-v3-turbo-ct2')"

# faster-whisper/CTranslate2 needs CUDA 12 cuBLAS + cuDNN at runtime; expose
# the pip-installed cu12 libs under a stable path (independent of the Python
# version's site-packages layout) and put them on the loader path.
# nvidia.cublas.lib / nvidia.cudnn.lib are namespace packages (no __file__),
# so locate the shared objects themselves and fail loudly if they're missing.
RUN set -e; \
    find_lib() { python -c "import glob, os, site, sys; \
d = sorted({os.path.dirname(f) for r in site.getsitepackages() for f in glob.glob(os.path.join(r, 'nvidia', '*', 'lib', sys.argv[1]))}); \
print(d[0]) if d else sys.exit('not found: ' + sys.argv[1])" "$1"; }; \
    CUBLAS_DIR="$(find_lib 'libcublas.so.12*')"; \
    CUDNN_DIR="$(find_lib 'libcudnn.so.9*')"; \
    echo "cuBLAS 12: $CUBLAS_DIR"; echo "cuDNN 9 (cu12): $CUDNN_DIR"; \
    mkdir -p /opt/cuda12; \
    ln -s "$CUBLAS_DIR" /opt/cuda12/cublas; \
    ln -s "$CUDNN_DIR" /opt/cuda12/cudnn; \
    ls /opt/cuda12/cublas/libcublas.so.12* /opt/cuda12/cudnn/libcudnn.so.9* >/dev/null
ENV LD_LIBRARY_PATH=/opt/cuda12/cublas:/opt/cuda12/cudnn:${LD_LIBRARY_PATH}

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

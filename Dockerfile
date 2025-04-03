FROM node:18-slim AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

FROM python:3.9-slim

# Add labels for ECS
LABEL com.amazonaws.ecs.container-name="transhla-predictor" \
      com.amazonaws.ecs.task-definition-family="transhla-task" \
      com.amazonaws.ecs.service-name="transhla-service"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app/ app/
COPY package.json .
COPY package-lock.json .
COPY run.py .

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set up static folder for Flask
RUN mkdir -p /app/app/static && \
    cp -r /app/frontend/dist/* /app/app/static/

# Set environment variables for cache locations
ENV HF_HOME=/app/.cache/huggingface \
    TORCH_HOME=/app/.cache/torch

# Create necessary directories and set permissions
RUN mkdir -p /app/.cache/torch/hub/checkpoints && \
    mkdir -p /app/.cache/huggingface && \
    chmod -R 755 /app/app/static && \
    chmod -R 755 /app/.cache

# Pre-download models during build time to avoid downloading at runtime
RUN echo "Pre-downloading TransHLA models during build..." && \
    python -c "from transformers import AutoTokenizer, AutoModel; \
    print('Downloading tokenizer...'); \
    tokenizer = AutoTokenizer.from_pretrained('facebook/esm2_t33_650M_UR50D'); \
    print('Downloading TransHLA_I model...'); \
    model_i = AutoModel.from_pretrained('SkywalkerLu/TransHLA_I', trust_remote_code=True); \
    print('Downloading TransHLA_II model...'); \
    model_ii = AutoModel.from_pretrained('SkywalkerLu/TransHLA_II', trust_remote_code=True); \
    print('All models downloaded successfully')"

# Create non-root user
RUN useradd -m -r -s /bin/bash appuser && \
    chown -R appuser:appuser /app

# Set environment variables
ENV FLASK_APP=app/app.py \
    FLASK_ENV=production \
    FLASK_DEBUG=0 \
    PORT=8080 \
    FLASK_RUN_PORT=8080 \
    PYTHONUNBUFFERED=1

# Expose the port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Switch to non-root user
USER appuser

# Run the application
CMD ["python", "run.py"] 
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone TransHLA repository
RUN git clone https://github.com/SkywalkerLuke/TransHLA.git /app/TransHLA

# Copy application code
COPY app/ app/
COPY run.py .

# Expose port
EXPOSE 8080

# Command to run the application
CMD ["python", "run.py"] 
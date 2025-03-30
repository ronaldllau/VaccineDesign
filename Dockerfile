FROM node:18-slim as frontend-builder

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
COPY start.js .
COPY package.json .
COPY package-lock.json .

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set up static folder for Flask
RUN mkdir -p /app/app/static
RUN cp -r /app/frontend/dist/* /app/app/static/

# Install Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Command to run the application
CMD ["node", "start.js"] 
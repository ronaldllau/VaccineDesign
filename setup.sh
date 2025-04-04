#!/bin/bash
# Setup script for TransHLA predictor

echo "Setting up TransHLA predictor..."

# Create cache directories
mkdir -p .cache/huggingface
mkdir -p .cache/torch/hub/checkpoints
mkdir -p models

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -e .

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "Setup complete! You can now run the application with 'node start.js'" 
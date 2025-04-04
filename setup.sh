#!/bin/bash
# Setup script for TransHLA predictor

echo "Setting up TransHLA Predictor..."

# Create cache directories if they don't exist
mkdir -p ./.cache/huggingface
mkdir -p ./.cache/torch/hub/checkpoints

# Uninstall existing package to avoid conflicts
pip uninstall -y transhla-predictor 2>/dev/null || true

# Determine Python version to handle compatibility issues
PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Detected Python version: $PYTHON_VERSION"

# Install Python dependencies based on Python version
echo "Installing Python dependencies..."

if [[ "$PYTHON_VERSION" == "3.12" ]]; then
    echo "Using Python 3.12 compatible packages..."
    
    # Core dependencies first
    pip install Flask==2.2.3 Werkzeug==2.2.3 flask-cors==3.0.10 Jinja2==3.1.2
    
    # Data and ML packages
    pip install numpy==1.26.3 pandas==2.1.4
    pip install scikit-learn==1.3.2
    pip install matplotlib==3.8.2 seaborn==0.13.0
    
    # PyTorch and related
    pip install torch==2.1.2
    pip install transformers==4.36.2
    
    # Special handling for fair-esm
    pip install fair-esm
    
    # Other utilities
    pip install requests==2.31.0 gunicorn==21.2.0
    
    # Install in development mode with --no-deps to avoid dependency conflicts
    pip install -e . --no-deps
else
    # For Python 3.8-3.11, use setup.py
    echo "Using standard package installation..."
    pip uninstall -y flask || true  # Remove any existing Flask installation
    pip install -e .
    
    # Install fair-esm separately to avoid potential issues
    pip install fair-esm
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "Setup complete! You can now run the application with: node start.js" 
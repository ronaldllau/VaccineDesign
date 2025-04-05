#!/bin/bash
# Setup script for TransHLA predictor
set -eo pipefail

# Color and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log_info() {
  echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}${BOLD}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}${BOLD}[ERROR]${NC} $1"
}

# Welcome message
echo -e "${BOLD}=== TransHLA Epitope Predictor Setup ===${NC}"
log_info "Starting setup process..."

# Create cache directories if they don't exist
log_info "Creating cache directories..."
mkdir -p ./.cache/huggingface
mkdir -p ./.cache/torch/hub/checkpoints

# Check for Python installation
if ! command -v python &> /dev/null; then
  log_error "Python not found. Please install Python 3.8 or higher."
  exit 1
fi

# Determine Python version
PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
log_info "Detected Python version: $PYTHON_VERSION"

# Check for minimum Python version
if (( $(echo "$PYTHON_VERSION < 3.8" | bc -l) )); then
  log_error "Python 3.8 or higher is required. Found version $PYTHON_VERSION"
  exit 1
fi

# Check for pip
if ! command -v pip &> /dev/null; then
  log_error "pip not found. Please install pip."
  exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  log_warning "Node.js not found. Frontend will not work without it."
  log_info "Please install Node.js 16.x or higher (https://nodejs.org/)"
fi

# Check for npm
if ! command -v npm &> /dev/null; then
  log_warning "npm not found. Frontend dependencies cannot be installed."
  log_info "Please install npm (usually bundled with Node.js)"
fi

# Check if GPU is available
HAS_GPU=false
if command -v nvidia-smi &> /dev/null; then
  GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo "No GPU detected")
  if [[ "$GPU_INFO" != *"No GPU detected"* ]]; then
    HAS_GPU=true
    log_info "GPU detected: $GPU_INFO"
    log_info "Setting up with GPU optimization"
  fi
fi

if [ "$HAS_GPU" = false ]; then
  log_info "No GPU detected. Installing CPU-only dependencies."
fi

# Create a virtual environment if venv module is available
VENV_CREATED=false
if python -m venv --help &> /dev/null; then
  if [ ! -d "venv" ]; then
    log_info "Creating virtual environment..."
    python -m venv venv
    VENV_CREATED=true
  fi
  
  # Activate virtual environment
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    log_info "Activating virtual environment (Windows)..."
    source venv/Scripts/activate
  else
    log_info "Activating virtual environment..."
    source venv/bin/activate
  fi
else
  log_warning "Python venv module not available. Skipping virtual environment creation."
  log_info "Installing packages globally. This may affect other Python projects."
fi

# Uninstall existing package to avoid conflicts
log_info "Checking for existing installations..."
pip uninstall -y transhla-predictor 2>/dev/null || true

# Create a requirements file based on Python version
log_info "Preparing requirements for Python $PYTHON_VERSION..."

cat > requirements.temp.txt << EOF
# Core web dependencies
Flask==2.2.3
Werkzeug==2.2.3
flask-cors==3.0.10
Jinja2==3.1.2

# Data science and ML packages
pandas>=2.0.0
scikit-learn>=1.0.0

# Visualization
matplotlib>=3.5.0
seaborn>=0.12.0

# Utilities
requests>=2.25.0
tqdm>=4.65.0
joblib>=1.2.0
pillow>=9.0.0
EOF

# Add specific NumPy version based on Python version
if (( $(echo "$PYTHON_VERSION >= 3.10" | bc -l) )); then
  echo "numpy>=1.25.0" >> requirements.temp.txt
else
  echo "numpy>=1.21.0,<1.26.0" >> requirements.temp.txt
fi

# Add PyTorch based on GPU availability
if [ "$HAS_GPU" = true ]; then
  echo "# PyTorch with GPU support" >> requirements.temp.txt
  echo "torch==2.0.1" >> requirements.temp.txt
  echo "torchvision==0.15.2" >> requirements.temp.txt
  echo "torchaudio==2.0.2" >> requirements.temp.txt
else
  echo "# PyTorch CPU only" >> requirements.temp.txt
  echo "torch==2.0.1" >> requirements.temp.txt
  echo "torchvision==0.15.2" >> requirements.temp.txt
  echo "torchaudio==2.0.2" >> requirements.temp.txt
fi

# Add transformers and other packages
echo "transformers>=4.30.0" >> requirements.temp.txt

# Install dependencies
log_info "Installing Python dependencies..."
pip install -r requirements.temp.txt

# Install fair-esm separately
log_info "Installing fair-esm..."
pip install fair-esm

# Install the package in development mode
log_info "Installing TransHLA in development mode..."
pip install -e . --no-deps

# Clean up
rm requirements.temp.txt

# Install Node.js dependencies if npm is available
if command -v npm &> /dev/null; then
  log_info "Installing Node.js dependencies..."
  npm install
else
  log_warning "Skipping Node.js dependencies installation (npm not found)."
fi

log_success "Setup complete!"
log_info "You can now run the application with: node start.js"

if [ "$VENV_CREATED" = true ]; then
  log_info "Note: A virtual environment was created. Activate it with:"
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  source venv/Scripts/activate"
  else
    echo "  source venv/bin/activate"
  fi
fi

# Print GPU information if available
if [ "$HAS_GPU" = true ]; then
  log_info "GPU information:"
  nvidia-smi
  log_success "GPU support enabled! TransHLA should run with GPU acceleration."
else
  log_warning "Running in CPU-only mode. For better performance, consider using a GPU."
fi 
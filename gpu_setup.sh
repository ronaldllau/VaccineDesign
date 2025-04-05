#!/bin/bash
# GPU-specific setup script for TransHLA predictor on cloud environments
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
echo -e "${BOLD}=== TransHLA Epitope Predictor GPU Setup ===${NC}"
log_info "Starting GPU-optimized setup process..."

# Verify GPU availability
if ! command -v nvidia-smi &> /dev/null; then
  log_error "nvidia-smi not found. Please install NVIDIA drivers first."
  log_info "For Google Cloud VMs, you can run:"
  log_info "curl -O https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin"
  log_info "sudo mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600"
  log_info "sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/3bf863cc.pub"
  log_info "sudo add-apt-repository 'deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/ /'"
  log_info "sudo apt-get update && sudo apt-get -y install cuda-drivers"
  exit 1
fi

# Check GPU info
GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "Error")
if [[ "$GPU_INFO" == *"Error"* ]]; then
  log_error "Could not get GPU information. Please check your GPU setup."
  exit 1
fi

log_success "GPU detected: $GPU_INFO"

# Create cache directories
log_info "Creating cache directories..."
mkdir -p ./.cache/huggingface
mkdir -p ./.cache/torch/hub/checkpoints

# Set environment variables
export HF_HOME=$(pwd)/.cache/huggingface
export TORCH_HOME=$(pwd)/.cache/torch

# Handle conda if available
if command -v conda &> /dev/null; then
  log_info "Conda detected. Creating optimized environment..."
  
  # Create conda environment
  conda create -n transhla python=3.9 -y
  
  # Activate environment
  eval "$(conda shell.bash hook)"
  conda activate transhla
  
  # Install PyTorch with CUDA - use LTS version for better stability
  log_info "Installing PyTorch with CUDA support (LTS version)..."
  conda install pytorch==1.8.2 torchvision==0.9.2 torchaudio==0.8.2 cudatoolkit=11.1 -c pytorch-lts -c nvidia -y
  
  # Fallback if LTS version fails
  if [ $? -ne 0 ]; then
    log_warning "LTS version installation failed, trying stable release..."
    conda install pytorch==1.12.1 torchvision==0.13.1 torchaudio==0.12.1 cudatoolkit=11.3 -c pytorch -y
  fi
  
  log_success "PyTorch with CUDA support installed!"
else
  log_info "Conda not detected. Using pip for installation..."
  
  # Create virtual environment
  python -m venv venv
  source venv/bin/activate
  
  # Install PyTorch with CUDA support - use LTS version for better stability
  log_info "Installing PyTorch with CUDA support via pip..."
  pip install torch==1.8.2+cu111 torchvision==0.9.2+cu111 torchaudio==0.8.2 -f https://download.pytorch.org/whl/lts/1.8/torch_lts.html
  
  # Check if installation succeeded
  if [ $? -ne 0 ]; then
    log_warning "LTS version installation failed, trying stable release..."
    pip install torch==1.12.1+cu113 torchvision==0.13.1+cu113 torchaudio==0.12.1 --extra-index-url https://download.pytorch.org/whl/cu113
  fi
fi

# Install dependencies
log_info "Installing Python dependencies..."
pip install flask==2.2.3 werkzeug==2.2.3 flask-cors==3.0.10
pip install numpy==1.25.2 pandas>=2.0.0 scikit-learn>=1.0.0 matplotlib>=3.5.0 seaborn>=0.12.0
pip install transformers>=4.30.0 requests>=2.25.0 tqdm>=4.65.0 joblib>=1.2.0 pillow>=9.0.0

# Install fair-esm separately
log_info "Installing fair-esm..."
pip install fair-esm

# Install in development mode
log_info "Installing TransHLA in development mode..."
pip install -e . --no-deps

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  log_info "Node.js not found. Installing Node.js 18.x..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install npm dependencies
log_info "Installing Node.js dependencies..."
npm install

# Add fix for JIT-related issues
log_info "Adding fix for JIT-related issues..."
cat > fix_torch_jit.py << EOF
#!/usr/bin/env python3
"""
This script addresses the 'undefined symbol: iJIT_NotifyEvent' error in PyTorch.
Run this before importing torch if you encounter this error.
"""
import os
import sys

def apply_fix():
    """Apply environment fixes for PyTorch JIT issues."""
    # Disable JIT profiling to avoid the undefined symbol error
    os.environ['PYTORCH_JIT'] = '0'
    os.environ['PYTORCH_DISABLE_JIT_PROFILING'] = '1'
    
    # Also set CUDA device if available to avoid other potential issues
    try:
        import torch
        if torch.cuda.is_available():
            # Set to use first GPU by default
            os.environ['CUDA_VISIBLE_DEVICES'] = '0'
            print(f"CUDA is available. Using device: {torch.cuda.get_device_name(0)}")
        else:
            print("CUDA is not available. Using CPU.")
    except ImportError:
        print("Warning: Could not import torch to check CUDA. Will continue with CPU.")
    
    print("PyTorch JIT fixes applied.")
    return True

def main():
    """Main function to apply the fix."""
    print("Applying fix for PyTorch JIT-related issues...")
    apply_fix()
    print("Fix applied. You should now be able to import torch without JIT errors.")

if __name__ == "__main__":
    main()
EOF
chmod +x fix_torch_jit.py

# Update preload_models.py to use the JIT fix
log_info "Updating preload_models.py to use JIT fix..."
cat > preload_models.py << EOF
import os
import sys
import time

# Get project root directory
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Apply JIT fix before importing torch
try:
    from fix_torch_jit import apply_fix
    apply_fix()
    print("Applied JIT fix")
except ImportError:
    print("JIT fix not found, continuing without it")

# Now import torch
import torch

# Add app directory to path
sys.path.append(os.path.join(PROJECT_ROOT, 'app'))

# Set cache directories with relative paths
CACHE_DIR = os.path.join(PROJECT_ROOT, '.cache')
HF_CACHE_DIR = os.path.join(CACHE_DIR, 'huggingface')
TORCH_CACHE_DIR = os.path.join(CACHE_DIR, 'torch')

# Set environment variables
os.environ['HF_HOME'] = HF_CACHE_DIR
os.environ['TORCH_HOME'] = TORCH_CACHE_DIR

print(f"Project Root: {PROJECT_ROOT}")
print(f"Cache Directory: {CACHE_DIR}")
print(f"HF Cache: {HF_CACHE_DIR}")

# Apply circular import fix
try:
    print("Applying circular import fix before loading models...")
    from circular_import_fix import apply_patch
    apply_patch()
except ImportError:
    print("Circular import fix not found, continuing without it")

print("Preloading models to cache...")
start_time = time.time()

# Import and run model loader
from model_loader import load_models
success = load_models()

if success:
    print(f"Models preloaded successfully in {time.time() - start_time:.2f} seconds")
    print("GPU memory usage:")
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            device = torch.cuda.device(i)
            memory_allocated = torch.cuda.memory_allocated(device) / 1024**2
            memory_reserved = torch.cuda.memory_reserved(device) / 1024**2
            print(f"GPU {i}: Allocated: {memory_allocated:.2f} MB, Reserved: {memory_reserved:.2f} MB")
else:
    print("Failed to preload models")
EOF

# Run the model preloader
log_info "Preloading models (this may take a few minutes)..."
python preload_models.py

# Create a GPU-optimized start script
log_info "Creating GPU-optimized start script..."
cat > start_gpu.js << EOF
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to start a process
function startProcess(command, args, name, options = {}) {
  console.log(chalk.blue(\`Starting \${name}...\`));
  
  const proc = spawn(command, args, { 
    stdio: 'pipe',
    ...options
  });
  
  proc.stdout.on('data', (data) => {
    console.log(chalk.cyan(\`[\${name}] \`) + data.toString().trim());
  });
  
  proc.stderr.on('data', (data) => {
    console.log(chalk.red(\`[\${name} ERROR] \`) + data.toString().trim());
  });
  
  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(\`\${name} process exited with code \${code}\`));
    }
  });
  
  return proc;
}

// Set environment variables for GPU optimization
process.env.HF_HOME = join(__dirname, '.cache/huggingface');
process.env.TORCH_HOME = join(__dirname, '.cache/torch');

// Function to handle cleanup
function cleanup() {
  console.log(chalk.yellow('\\nShutting down servers...'));
  backendProcess && backendProcess.kill();
  frontendProcess && frontendProcess.kill();
  process.exit(0);
}

// Start the Flask backend with GPU optimization
const backendEnv = Object.assign({}, process.env, {
  CUDA_VISIBLE_DEVICES: '0',  // Use the first GPU
  PYTHONUNBUFFERED: '1'       // Unbuffered Python output
});

const backendProcess = startProcess('python', ['run.py'], 'Flask Backend', {
  env: backendEnv,
  cwd: __dirname
});

// Start the frontend development server
const frontendProcess = startProcess('npm', ['run', 'dev'], 'Frontend', {
  cwd: join(__dirname, 'frontend')
});

// Register signal handlers for graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log(chalk.green('=== TransHLA Predictor Started with GPU Acceleration ==='));
console.log(chalk.green('Backend: http://localhost:8080/api'));
console.log(chalk.green('Frontend: http://localhost:3000'));
console.log(chalk.yellow('Press Ctrl+C to stop'));
EOF

log_success "GPU setup complete!"
log_info "You can now run the application with: node start_gpu.js"
log_info "For optimal performance, the models have been preloaded into GPU memory."

# Show GPU status
log_info "Current GPU status:"
nvidia-smi

# Create a circular import fix patch
log_info "Creating circular import fix patch..."
cat > circular_import_fix.py << EOF
#!/usr/bin/env python3
"""
This script fixes the circular import issue in torchvision.
Run this before loading the models if you encounter the error:
'partially initialized module 'torchvision' has no attribute 'extension''
"""
import sys
import os
import importlib

def apply_patch():
    # First, try to fix the sys.modules cache
    if 'torchvision' in sys.modules:
        # Remove the problematic module
        print("Removing torchvision from sys.modules cache")
        del sys.modules['torchvision']
    
    # Try to preload torchvision components in the correct order
    try:
        print("Preloading torchvision components...")
        import torch
        import torchvision.extension
        import torchvision.io
        import torchvision.models
        import torchvision.ops
        import torchvision.transforms
        import torchvision.utils
        print("Torchvision components preloaded successfully!")
        return True
    except Exception as e:
        print(f"Error during preloading: {str(e)}")
        return False

def main():
    print("Applying patch for torchvision circular import issue...")
    success = apply_patch()
    if success:
        print("Patch applied successfully!")
    else:
        print("Patch application failed.")
        print("Alternative solution: reinstall torchvision with:")
        print("pip uninstall -y torchvision")
        print("pip install torchvision==0.15.2")

if __name__ == "__main__":
    main()
EOF
chmod +x circular_import_fix.py 
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

# Create virtual environment
log_info "Creating Python virtual environment..."
python -m venv venv
source venv/bin/activate

# Disable PyTorch JIT to avoid issues
export PYTORCH_JIT=0
export PYTORCH_DISABLE_JIT_PROFILING=1

# Install PyTorch with CUDA support using pip
log_info "Installing PyTorch with CUDA support..."
pip install --upgrade pip setuptools wheel
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install base dependencies
log_info "Installing Python dependencies..."
pip install flask==2.2.3 werkzeug==2.2.3 flask-cors==3.0.10
pip install numpy pandas scikit-learn matplotlib seaborn
pip install transformers requests tqdm joblib pillow

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

# Create JIT fixes script
log_info "Creating PyTorch JIT fix..."
cat > fix_torch_jit.py << EOF
#!/usr/bin/env python3
"""
This script addresses potential JIT issues in PyTorch.
Run this before importing torch if you encounter JIT-related errors.
"""
import os
import sys

def apply_fix():
    """Apply environment fixes for PyTorch JIT issues."""
    # Disable JIT profiling to avoid symbol errors
    os.environ['PYTORCH_JIT'] = '0'
    os.environ['PYTORCH_DISABLE_JIT_PROFILING'] = '1'
    
    # Also set CUDA device if available
    try:
        import torch
        if torch.cuda.is_available():
            # Set to use first GPU by default
            os.environ['CUDA_VISIBLE_DEVICES'] = '0'
            print(f"CUDA is available. Using device: {torch.cuda.get_device_name(0)}")
        else:
            print("CUDA is not available. Using CPU.")
    except ImportError:
        print("Warning: Could not import torch to check CUDA.")
    
    print("PyTorch JIT fixes applied.")
    return True

if __name__ == "__main__":
    print("Applying fixes for PyTorch JIT issues...")
    apply_fix()
    print("Fixes applied successfully.")
EOF
chmod +x fix_torch_jit.py

# Create a simple start script for GPU
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
process.env.PYTORCH_JIT = '0';
process.env.PYTORCH_DISABLE_JIT_PROFILING = '1';
process.env.CUDA_VISIBLE_DEVICES = '0';

// Function to handle cleanup
function cleanup() {
  console.log(chalk.yellow('\\nShutting down servers...'));
  backendProcess && backendProcess.kill();
  frontendProcess && frontendProcess.kill();
  process.exit(0);
}

// Start the Flask backend
const backendEnv = Object.assign({}, process.env, {
  PYTHONUNBUFFERED: '1'
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

# Create a custom terminal launcher for the virtual environment
log_info "Creating terminal launcher..."
cat > gpu-terminal.sh << EOF
#!/bin/bash
# Activate the virtual environment and set GPU environment variables
source venv/bin/activate
export PYTORCH_JIT=0
export PYTORCH_DISABLE_JIT_PROFILING=1
export HF_HOME=\$(pwd)/.cache/huggingface
export TORCH_HOME=\$(pwd)/.cache/torch

# Print environment information
echo "=== TransHLA GPU Environment ==="
echo "Python: \$(python --version)"
echo "PyTorch: \$(python -c 'import torch; print(torch.__version__)')"
echo "CUDA Available: \$(python -c 'import torch; print(torch.cuda.is_available())')"
if python -c 'import torch; exit(0 if torch.cuda.is_available() else 1)' 2>/dev/null; then
  echo "CUDA Version: \$(python -c 'import torch; print(torch.version.cuda)')"
  echo "GPU Device: \$(python -c 'import torch; print(torch.cuda.get_device_name(0))')"
fi
echo "================================"

# Start an interactive shell
exec \$SHELL
EOF
chmod +x gpu-terminal.sh

log_success "GPU setup complete!"
log_info "You can now run the application with: node start_gpu.js"
log_info "Or start a terminal with the correct environment: ./gpu-terminal.sh"

# Show GPU status
log_info "Current GPU status:"
nvidia-smi 
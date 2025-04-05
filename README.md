# TransHLA Epitope Predictor

A web application that predicts whether a peptide will be recognized by HLA as an epitope using the TransHLA model.

## Features

- Predict whether peptide sequences are likely to be recognized as epitopes by HLA molecules
- Supports both HLA class I (8-14 amino acids) and class II (13-21 amino acids) epitope prediction
- Uses advanced hybrid transformer models with no need to specify HLA alleles
- Visualize prediction scores with interactive charts
- Input validation for proper peptide sequences
- Responsive design for desktop and mobile
- GPU acceleration support for faster predictions with large sequences

## How It Works

This application uses [TransHLA](https://github.com/SkywalkerLuke/TransHLA), a hybrid transformer model that utilizes a transformer encoder module and a deep CNN module. It is trained using pretrained sequence embeddings from ESM2 and contact map structural features as inputs.

- **TransHLA_I**: For predicting HLA class I epitopes (peptides 8-14 amino acids long)
- **TransHLA_II**: For predicting HLA class II epitopes (peptides 13-21 amino acids long)

## Requirements

- Python 3.8+ (3.9 recommended)
- Node.js 16+ (for frontend and start scripts)
- PyTorch (CPU or GPU version)
- Flask and related packages
- Transformers library
- fair-esm

## Quick Start (Recommended)

The easiest way to run this application is to use our automated setup:

```bash
# Clone the repository
git clone https://github.com/ronaldllau/VaccineDesign.git
cd VaccineDesign

# Run the setup script (creates necessary directories and installs dependencies)
chmod +x setup.sh
./setup.sh

# Start both the frontend and backend with a single command
node start.js
```

## Environment-Specific Setup

### Standard CPU Environment

Follow the Quick Start instructions above - the `setup.sh` script will automatically detect your environment and install the appropriate dependencies.

### GPU Environment (NVIDIA)

For environments with NVIDIA GPUs (cloud VMs, workstations with NVIDIA cards):

```bash
# Clone the repository
git clone https://github.com/ronaldllau/VaccineDesign.git
cd VaccineDesign

# Make sure the GPU setup script is executable
chmod +x gpu_setup.sh

# Run the GPU-optimized setup script
./gpu_setup.sh

# Start the application with GPU acceleration
node start_gpu.js
```

The GPU setup script will:
1. Verify NVIDIA drivers are installed
2. Install PyTorch with CUDA support
3. Configure the environment for optimal GPU usage
4. Preload models to ensure faster predictions

### GitHub Codespaces (Cloud Development)

This project is configured to work with GitHub Codespaces, which provides a development environment in the cloud:

1. Navigate to the repository on GitHub
2. Click the green "Code" button
3. Select the "Codespaces" tab
4. Click "Create codespace on main"
5. When the codespace is ready, run in the terminal:
   ```bash
   # Install all dependencies
   ./setup.sh
   
   # Start the application
   node start.js
   ```
6. Click on the "PORTS" tab and open the forwarded port (usually 5173 or 8080)

**Note:** The first time you run the application, it will download large model files (~1.5GB) which may take several minutes.

### Google Cloud / AWS / Azure (With GPU)

For cloud VMs with GPU:

1. Create a VM instance with an NVIDIA GPU
   - For Google Cloud: Use an N1 or T4 instance with NVIDIA Tesla T4 GPU
   - For AWS: Use a p3 or g4dn instance
   - For Azure: Use an NC or NCv3 instance

2. Install NVIDIA drivers if not pre-installed:
   ```bash
   # For Ubuntu 22.04 (commands may vary based on OS)
   curl -O https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin
   sudo mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600
   sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/3bf863cc.pub
   sudo add-apt-repository "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/ /"
   sudo apt-get update && sudo apt-get -y install cuda-drivers
   ```

3. Follow the GPU environment setup above

### Local Development Setup (Manual Configuration)

If you prefer to set up the environment manually:

1. Clone this repository:
```
git clone https://github.com/ronaldllau/VaccineDesign.git
cd VaccineDesign
```

2. Create a virtual environment and activate it:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install required packages:
```
pip install -e .  # Installs from setup.py
pip install fair-esm  # Install fair-esm separately
```

4. Install Node.js dependencies:
```
npm install
```

5. Create necessary cache directories:
```
mkdir -p .cache/huggingface
mkdir -p .cache/torch/hub/checkpoints
mkdir -p models
```

6. Start both servers at once with the convenience script:
```
node start.js
```

   Or start the servers individually:

   a. Start the Flask backend:
   ```
   python run.py
   ```

   b. In a separate terminal, start the frontend development server:
   ```
   npm run dev
   ```

7. Access the application:
   - Frontend development server: http://localhost:5173
   - Backend API: http://localhost:8080

## Docker Deployment

Docker is an alternative way to run this application in production as it handles all dependencies and properly configures the environment.

### Standard Docker Deployment

1. Build the Docker image:
```
docker build -t transhla-predictor .
```

2. Create a persistent volume for model caching:
```
docker volume create model_cache
```

3. Run the container with the volume mounted:
```
docker run -v model_cache:/app/.cache -p 8080:8080 transhla-predictor
```

4. Access the application at http://localhost:8080

### NVIDIA Docker (GPU Support)

For Docker with GPU support:

1. Install the NVIDIA Docker runtime:
```
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

2. Build the image as above, then run with GPU support:
```
docker run --gpus all -v model_cache:/app/.cache -p 8080:8080 transhla-predictor
```

### Important Notes

- **First Run**: The first time you run the container, it will download large model files (~1.5GB) which may take several minutes.
- **Memory Requirements**: This application requires at least 4GB of memory to load the models. For Docker Desktop users, ensure you allocate sufficient memory in the Resources settings.
- **Model Caching**: Using a Docker volume (`model_cache`) ensures model files are downloaded only once and reused in subsequent container runs.
- **GPU Memory**: When using GPU acceleration, ensure you have at least 4GB of GPU memory available.

## AWS ECS Deployment

For production deployment to AWS Elastic Container Service (ECS), follow these steps:

1. Build and push the Docker image to Amazon ECR:
```
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
docker tag transhla-predictor:latest your-account-id.dkr.ecr.your-region.amazonaws.com/transhla-predictor:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/transhla-predictor:latest
```

2. Set up an EFS volume for model caching. In your ECS task definition, include:
```json
{
  "volumes": [
    {
      "name": "model-cache",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxxxxx",
        "rootDirectory": "/"
      }
    }
  ],
  "containerDefinitions": [
    {
      "mountPoints": [
        {
          "sourceVolume": "model-cache",
          "containerPath": "/app/.cache"
        }
      ]
    }
  ]
}
```

3. For GPU support on ECS, use p3 or g4 instances and add the appropriate flags to your task definition.

## Usage

1. Enter a peptide sequence in the input field:
   - 8-14 amino acids for HLA class I
   - 13-21 amino acids for HLA class II

2. Select options:
   - Choose between HLA class I or II
   - Select single peptide or sliding window mode

3. Click "Predict" to submit the sequence

4. View the prediction results:
   - Probability score
   - Visual representation
   - Classification as epitope (>0.5) or non-epitope (≤0.5)

### Sample Peptides for Testing

- HLA Class I: `YANSVFNIC`
- HLA Class II: `LGLWLSVGALDFTLS`

## Processing Large Sequences

When using Sliding Window mode, you can process larger protein sequences:
- CPU environments: Up to 1,000 amino acids
- GPU environments: Up to 3,000 amino acids (depends on available memory)

For very large sequences, consider:
1. Using the GPU-accelerated setup
2. Breaking the sequence into chunks for sequential processing

## Troubleshooting

- **ESM Module Not Found**: If you get an error about missing "esm" module, run: `pip install fair-esm`
- **Container crashes on startup**: Ensure your Docker engine has enough memory allocated (minimum 4GB recommended)
- **Slow first prediction**: The first prediction request triggers model loading, which may take 1-2 minutes
- **"No valid peptides" error**: Check that your peptide contains only valid amino acid letters (ACDEFGHIKLMNPQRSTVWY)
- **CUDA errors**: If you encounter CUDA-related errors, ensure your GPU drivers are compatible with the installed PyTorch version
- **Permission errors with cache directories**: The application will attempt to use temporary directories if it cannot create the regular cache directories

### Environment-Specific Issues

#### GPU Setup
- **"nvidia-smi not found"**: NVIDIA drivers are not installed or not in PATH
- **CUDA version mismatch**: Ensure the installed CUDA version is compatible with your PyTorch version

#### Codespaces
- **Port forwarding issues**: Check the "PORTS" tab to ensure proper port forwarding is configured

## License

MIT

## Acknowledgments

- [TransHLA](https://github.com/SkywalkerLuke/TransHLA) - Hybrid transformer model for peptide-HLA epitope detection
- [ESM2](https://github.com/facebookresearch/esm) - Evolutionary Scale Modeling for protein language models 
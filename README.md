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

## Quick Start

The easiest way to run this application is to use the automated setup:

```bash
# Clone the repository
git clone https://github.com/ronaldllau/VaccineDesign.git
cd VaccineDesign

# Run the setup script (creates necessary directories and installs dependencies)
chmod +x setup.sh
./setup.sh

# Activate the virtual environment created by the setup script
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start both the frontend and backend with a single command
node start.js
```

> **IMPORTANT**: You must activate the virtual environment with `source venv/bin/activate` before running the application, as all Python dependencies are installed in this isolated environment.

## GPU Environment (NVIDIA)

For environments with NVIDIA GPUs:

```bash
# Clone the repository
git clone https://github.com/ronaldllau/VaccineDesign.git
cd VaccineDesign

# Make sure the GPU setup script is executable
chmod +x gpu_setup.sh

# Run the GPU-optimized setup script
./gpu_setup.sh

# Activate the virtual environment created by the setup script
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start the application with GPU acceleration
node start_gpu.js
```

The GPU setup script will:
1. Verify NVIDIA drivers are installed
2. Install PyTorch with CUDA support
3. Configure the environment for optimal GPU usage
4. Set up the virtual environment with all dependencies

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

## Acknowledgments

- [TransHLA](https://github.com/SkywalkerLuke/TransHLA) - Hybrid transformer model for peptide-HLA epitope detection
- [ESM2](https://github.com/facebookresearch/esm) - Evolutionary Scale Modeling for protein language models 
# TransHLA Epitope Predictor

A web application that predicts whether a peptide will be recognized by HLA as an epitope using the TransHLA model.

## Features

- Predict whether peptide sequences are likely to be recognized as epitopes by HLA molecules
- Supports both HLA class I (8-14 amino acids) and class II (13-21 amino acids) epitope prediction
- Uses advanced hybrid transformer models with no need to specify HLA alleles
- Visualize prediction scores with interactive charts
- Input validation for proper peptide sequences
- Responsive design for desktop and mobile

## How It Works

This application uses [TransHLA](https://github.com/SkywalkerLuke/TransHLA), a hybrid transformer model that utilizes a transformer encoder module and a deep CNN module. It is trained using pretrained sequence embeddings from ESM2 and contact map structural features as inputs.

- **TransHLA_I**: For predicting HLA class I epitopes (peptides 8-14 amino acids long)
- **TransHLA_II**: For predicting HLA class II epitopes (peptides 13-21 amino acids long)

## Requirements

- Python 3.9+
- Flask
- PyTorch
- Transformers
- fair-esm
- pandas
- numpy

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

## GitHub Codespaces (Cloud Development)

This project is configured to work with GitHub Codespaces, which provides a powerful cloud-based development environment:

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

## Local Development Setup (Advanced Users)

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
# Alternatively: pip install -r requirements.txt
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

### Quick Start

1. Build the Docker image:
```
docker build -t vaccine-design .
```

2. Create a persistent volume for model caching:
```
docker volume create model_cache
```

3. Run the container with the volume mounted:
```
docker run -v model_cache:/app/.cache -p 8080:8080 vaccine-design
```

4. Access the application at http://localhost:8080

### Important Notes

- **First Run**: The first time you run the container, it will download large model files (~1.5GB) which may take several minutes.
- **Memory Requirements**: This application requires at least 4GB of memory to load the models. For Docker Desktop users, ensure you allocate sufficient memory in the Resources settings.
- **Model Caching**: Using a Docker volume (`model_cache`) ensures model files are downloaded only once and reused in subsequent container runs.

## AWS ECS Deployment

For production deployment to AWS Elastic Container Service (ECS), follow these steps:

1. Build and push the Docker image to Amazon ECR:
```
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
docker tag vaccine-design:latest your-account-id.dkr.ecr.your-region.amazonaws.com/vaccine-design:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/vaccine-design:latest
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

3. Deploy the task definition as a service behind a load balancer. See [aws-deployment-guide.md](aws-deployment-guide.md) for detailed instructions.

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

## Troubleshooting

- **ESM Module Not Found**: If you get an error about missing "esm" module, run: `pip install fair-esm`
- **Container crashes on startup**: Ensure your Docker engine has enough memory allocated (minimum 4GB recommended)
- **Slow first prediction**: The first prediction request triggers model loading, which may take 1-2 minutes
- **"No valid peptides" error**: Check that your peptide contains only valid amino acid letters (ACDEFGHIKLMNPQRSTVWY)
- **CORS issues in development**: When running with `node start.js`, the frontend and backend are on different ports, which requires proper CORS configuration. If you encounter CORS errors, ensure you're accessing the application through the frontend URL (http://localhost:5173) and not directly via the backend URL.

## License

MIT

## Acknowledgments

- [TransHLA](https://github.com/SkywalkerLuke/TransHLA) - Hybrid transformer model for peptide-HLA epitope detection
- [ESM2](https://github.com/facebookresearch/esm) - Evolutionary Scale Modeling for protein language models 
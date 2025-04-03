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

## Local Development Setup

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
pip install -r requirements.txt
```

4. Install frontend dependencies and build the frontend (optional for development):
```
# Install frontend dependencies
cd frontend
npm install
cd ..

# Build the frontend (only needed for production)
cd frontend
npm run build
cd ..
```

5. Start both servers at once with the convenience script (recommended for development):
```
node start.js
```

   This will start both the Flask backend and the React frontend development server.

   Or start the servers individually:

   a. Start the Flask backend:
   ```
   python run.py
   ```

   b. In a separate terminal, start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

6. Access the application:
   - Frontend development server: http://localhost:5173 (when using `node start.js` or `npm run dev`)
   - Backend API: http://localhost:8080

## Docker Deployment (Recommended)

Docker is the recommended way to run this application in production as it handles all dependencies and properly configures the environment.

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

- **Container crashes on startup**: Ensure your Docker engine has enough memory allocated (minimum 4GB recommended)
- **Slow first prediction**: The first prediction request triggers model loading, which may take 1-2 minutes
- **"No valid peptides" error**: Check that your peptide contains only valid amino acid letters (ACDEFGHIKLMNPQRSTVWY)
- **CORS issues in development**: When running with `node start.js`, the frontend and backend are on different ports, which requires proper CORS configuration. If you encounter CORS errors, ensure you're accessing the application through the frontend URL (http://localhost:5173) and not directly via the backend URL.

## License

MIT

## Acknowledgments

- [TransHLA](https://github.com/SkywalkerLuke/TransHLA) - Hybrid transformer model for peptide-HLA epitope detection
- [ESM2](https://github.com/facebookresearch/esm) - Evolutionary Scale Modeling for protein language models 
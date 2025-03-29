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

## Local Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/VaccineDesign.git
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

4. Start the application:
```
python run.py
```

Then open a web browser and navigate to `http://localhost:8080`

## Docker Deployment

1. Build the Docker image:
```
docker build -t transhla-predictor .
```

2. Run the container:
```
docker run -p 8080:8080 transhla-predictor
```

Then open a web browser and navigate to `http://localhost:8080`

## AWS ECS Deployment

This application can be deployed to AWS ECS for better scalability. See [aws-deployment-guide.md](aws-deployment-guide.md) for detailed instructions.

## Usage

1. Enter a peptide sequence (8-21 amino acids) in the input field
2. Click "Predict" to submit the sequence
3. View the prediction results displayed in a table and chart
4. Results include the probability of the peptide being recognized as an epitope

## About TransHLA

TransHLA is a tool designed to discern whether a peptide will be recognized by HLA as an epitope. It is the first tool capable of directly identifying peptides as epitopes without the need for inputting HLA alleles.

Due to variations in peptide lengths, TransHLA is divided into:
- TransHLA_I: Used for identifying epitopes presented by HLA class I molecules (8-14 amino acids)
- TransHLA_II: Used for identifying epitopes presented by HLA class II molecules (13-21 amino acids)

For more information, visit the [TransHLA GitHub repository](https://github.com/SkywalkerLuke/TransHLA).

## License

MIT

## Acknowledgments

- [TransHLA](https://github.com/SkywalkerLuke/TransHLA) - Hybrid transformer model for peptide-HLA epitope detection 
from flask import Flask, render_template, request, jsonify
import os
import sys
import pandas as pd
import numpy as np
import json
import torch
from transformers import AutoTokenizer
from werkzeug.utils import secure_filename

# Add TransHLA directory to path
sys.path.append('/app/TransHLA')

# Import TransHLA models
try:
    from transformers import AutoModel
except ImportError:
    print("Transformers not installed. Please run: pip install transformers")

app = Flask(__name__)

# Load TransHLA models and tokenizer
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = None
transHLA_I_model = None
transHLA_II_model = None

def load_models():
    global tokenizer, transHLA_I_model, transHLA_II_model
    print(f"Using {device} device")
    try:
        tokenizer = AutoTokenizer.from_pretrained("facebook/esm2_t33_650M_UR50D")
        transHLA_I_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_I", trust_remote_code=True)
        transHLA_I_model.to(device)
        transHLA_I_model.eval()
        
        transHLA_II_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_II", trust_remote_code=True)
        transHLA_II_model.to(device)
        transHLA_II_model.eval()
        
        print("Models loaded successfully!")
    except Exception as e:
        print(f"Error loading models: {str(e)}")

# Load models at startup
load_models()

def pad_sequences(sequences, target_length):
    """Pad sequences to target length."""
    for sequence in sequences:
        padding_length = target_length - len(sequence)
        if padding_length > 0:
            sequence.extend([1] * padding_length)
    return sequences

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        data = request.get_json()
        peptide_seq = data.get('sequence', '')
        
        if not peptide_seq:
            return jsonify({'error': 'No peptide sequence provided'}), 400
            
        # Basic validation
        if not is_valid_peptide(peptide_seq):
            return jsonify({'error': 'Invalid peptide sequence. Use only valid amino acid letters.'}), 400
            
        try:
            # Run prediction with TransHLA
            predictions = run_prediction(peptide_seq)
            return jsonify(predictions)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

def is_valid_peptide(peptide):
    """Check if peptide contains only valid amino acid letters."""
    valid_aa = set('ACDEFGHIKLMNPQRSTVWY')
    return set(peptide.upper()).issubset(valid_aa)

def run_prediction(peptide_seq):
    """Run epitope prediction using TransHLA."""
    global tokenizer, transHLA_I_model, transHLA_II_model
    try:
        peptide_seq = peptide_seq.upper()
        peptide_length = len(peptide_seq)
        
        # Determine which model to use based on peptide length
        if 8 <= peptide_length <= 14:
            # Use TransHLA_I for shorter peptides
            model = transHLA_I_model
            max_length = 16
        elif 13 <= peptide_length <= 21:
            # Use TransHLA_II for longer peptides
            model = transHLA_II_model
            max_length = 23
        else:
            raise ValueError(f"Peptide length {peptide_length} is outside the supported range (8-21 amino acids)")
        
        # Tokenize the peptide
        peptide_encoding = tokenizer([peptide_seq])['input_ids']
        padded_encoding = pad_sequences(peptide_encoding, max_length)
        
        # Convert to tensor and move to device
        input_tensor = torch.tensor(padded_encoding).to(device)
        
        # Get the prediction
        with torch.no_grad():
            outputs, representations = model(input_tensor)
        
        # Process outputs
        probability = outputs[0][1].item()  # Probability of being an epitope
        label = 1 if probability > 0.5 else 0
        
        # Create results dictionary
        prediction_result = {
            'peptide': peptide_seq,
            'probability': probability,
            'is_epitope': (label == 1)
        }
        
        # Format for the frontend
        return {
            'peptide': peptide_seq,
            'results': [prediction_result]
        }
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        raise Exception(f"Error during prediction: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True) 
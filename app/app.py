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
        hla_class = data.get('hla_class', 'I')  # Default to Class I if not specified
        
        if not peptide_seq:
            return jsonify({'error': 'No peptide sequence provided'}), 400
            
        # Basic validation
        if not is_valid_peptide(peptide_seq):
            return jsonify({'error': 'Invalid peptide sequence. Use only valid amino acid letters.'}), 400
        
        process_mode = data.get('mode', 'single')
        
        if process_mode == 'single':
            try:
                # Run prediction for a single peptide
                predictions = run_prediction(peptide_seq, hla_class)
                return jsonify(predictions)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        elif process_mode == 'sliding':
            try:
                # Generate and predict all possible peptides
                predictions = run_sliding_window_prediction(peptide_seq, hla_class)
                return jsonify(predictions)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Invalid processing mode'}), 400

def is_valid_peptide(peptide):
    """Check if peptide contains only valid amino acid letters."""
    valid_aa = set('ACDEFGHIKLMNPQRSTVWY')
    return set(peptide.upper()).issubset(valid_aa)

def generate_peptides(sequence, hla_class='I'):
    """Generate all possible peptides within the length range appropriate for the HLA class."""
    peptides = []
    
    # Validate sequence and convert to uppercase
    sequence = sequence.upper()
    
    # Set length ranges based on HLA class
    if hla_class == 'I':
        min_length = 8
        max_length = 14
    else:  # Class II
        min_length = 13
        max_length = 21
    
    # Generate peptides for each possible length
    for length in range(min_length, min(max_length + 1, len(sequence) + 1)):
        # Slide a window of the current length over the sequence
        for i in range(len(sequence) - length + 1):
            peptide = sequence[i:i+length]
            peptides.append({
                'peptide': peptide,
                'position': i + 1,  # 1-indexed position
                'length': length
            })
    
    return peptides

def run_sliding_window_prediction(sequence, hla_class='I'):
    """Run predictions on all possible peptides within the sequence."""
    # Generate all valid peptides for the specified HLA class
    peptide_list = generate_peptides(sequence, hla_class)
    
    if not peptide_list:
        raise ValueError(f"No valid peptides could be generated for HLA class {hla_class} from the given sequence")
    
    # Process each peptide
    predictions = []
    
    for peptide_info in peptide_list:
        peptide = peptide_info['peptide']
        position = peptide_info['position']
        length = peptide_info['length']
        
        # Run prediction and get result
        result = run_prediction(peptide, hla_class)['results'][0]
        result['position'] = position
        result['length'] = length
        result['class'] = hla_class
        predictions.append(result)
    
    # Sort by position and then by length
    predictions.sort(key=lambda x: (x['position'], x['length']))
    
    # Calculate overall epitope density
    total_peptides = len(predictions)
    epitope_count = sum(1 for p in predictions if p['is_epitope'])
    epitope_density = epitope_count / total_peptides if total_peptides > 0 else 0
    
    return {
        'original_sequence': sequence,
        'total_peptides': total_peptides,
        'epitope_count': epitope_count,
        'epitope_density': epitope_density,
        'hla_class': hla_class,
        'results': predictions
    }

def run_prediction(peptide_seq, hla_class='I'):
    """Run epitope prediction using TransHLA."""
    global tokenizer, transHLA_I_model, transHLA_II_model
    try:
        peptide_seq = peptide_seq.upper()
        
        # Select model based on HLA class
        if hla_class == 'I':
            model = transHLA_I_model
            max_length = 16
            
            # Validate peptide length for Class I
            if len(peptide_seq) < 8 or len(peptide_seq) > 14:
                print(f"Warning: Peptide length {len(peptide_seq)} may not be optimal for HLA Class I prediction")
        else:  # Class II
            model = transHLA_II_model
            max_length = 23
            
            # Validate peptide length for Class II
            if len(peptide_seq) < 13 or len(peptide_seq) > 21:
                print(f"Warning: Peptide length {len(peptide_seq)} may not be optimal for HLA Class II prediction")
        
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
            'is_epitope': (label == 1),
            'hla_class': hla_class
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
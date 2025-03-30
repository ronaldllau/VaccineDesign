from flask import Flask, render_template, request, jsonify
import os
import sys
import pandas as pd
import numpy as np
import json
import torch
import traceback
from transformers import AutoTokenizer
from werkzeug.utils import secure_filename
import time
from functools import lru_cache

# Remove hardcoded path and handle imports more gracefully
try:
    from transformers import AutoModel
    print("Successfully imported transformers")
except ImportError:
    print("Transformers not installed. Please run: pip install transformers")

app = Flask(__name__)

# Load TransHLA models and tokenizer
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = None
transHLA_I_model = None
transHLA_II_model = None

# Cache to store previously computed results (limited to 100 entries)
prediction_cache = {}
MAX_CACHE_SIZE = 100

def load_models():
    global tokenizer, transHLA_I_model, transHLA_II_model
    print(f"Using {device} device")
    try:
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("facebook/esm2_t33_650M_UR50D")
        print("Tokenizer loaded successfully")
        
        print("Loading TransHLA_I model...")
        transHLA_I_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_I", trust_remote_code=True)
        transHLA_I_model.to(device)
        transHLA_I_model.eval()
        print("TransHLA_I model loaded successfully")
        
        print("Loading TransHLA_II model...")
        transHLA_II_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_II", trust_remote_code=True)
        transHLA_II_model.to(device)
        transHLA_II_model.eval()
        print("TransHLA_II model loaded successfully")
        
        print("All models loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        traceback.print_exc()
        return False

# Try to load models at startup
models_loaded = load_models()

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
        start_time = time.time()
        data = request.get_json()
        peptide_seq = data.get('sequence', '')
        hla_class = data.get('hla_class', 'I')  # Default to Class I if not specified
        
        if not peptide_seq:
            return jsonify({'error': 'No peptide sequence provided'}), 400
            
        # Check if models are loaded
        global models_loaded, tokenizer, transHLA_I_model, transHLA_II_model
        if not models_loaded or tokenizer is None or transHLA_I_model is None or transHLA_II_model is None:
            # Try loading models one more time
            models_loaded = load_models()
            if not models_loaded:
                return jsonify({'error': 'Models could not be loaded. Please check server logs.'}), 500
            
        # Basic validation
        if not is_valid_peptide(peptide_seq):
            return jsonify({'error': 'Invalid peptide sequence. Use only valid amino acid letters.'}), 400
        
        process_mode = data.get('mode', 'single')
        
        if process_mode == 'single':
            try:
                # Generate cache key
                cache_key = f"single_{peptide_seq}_{hla_class}"
                
                # Check if result is in cache
                if cache_key in prediction_cache:
                    print(f"Cache hit for {cache_key}")
                    return jsonify(prediction_cache[cache_key])
                
                # Run prediction for a single peptide
                predictions = run_prediction(peptide_seq, hla_class)
                
                # Cache the result
                prediction_cache[cache_key] = predictions
                # Remove oldest entry if cache is full
                if len(prediction_cache) > MAX_CACHE_SIZE:
                    oldest_key = next(iter(prediction_cache))
                    del prediction_cache[oldest_key]
                
                print(f"Prediction completed in {time.time() - start_time:.2f} seconds")
                return jsonify(predictions)
            except Exception as e:
                print(f"Error in single prediction mode: {str(e)}")
                traceback.print_exc()
                return jsonify({'error': f"Error during prediction: {str(e)}"}), 500
        elif process_mode == 'sliding':
            try:
                # Generate cache key
                cache_key = f"sliding_{peptide_seq}_{hla_class}"
                
                # Check if result is in cache
                if cache_key in prediction_cache:
                    print(f"Cache hit for {cache_key}")
                    return jsonify(prediction_cache[cache_key])
                
                # Generate and predict all possible peptides
                predictions = run_sliding_window_prediction(peptide_seq, hla_class)
                
                # Cache the result
                prediction_cache[cache_key] = predictions
                # Remove oldest entry if cache is full
                if len(prediction_cache) > MAX_CACHE_SIZE:
                    oldest_key = next(iter(prediction_cache))
                    del prediction_cache[oldest_key]
                
                print(f"Sliding window analysis completed in {time.time() - start_time:.2f} seconds")
                return jsonify(predictions)
            except Exception as e:
                print(f"Error in sliding window mode: {str(e)}")
                traceback.print_exc()
                return jsonify({'error': f"Error during prediction: {str(e)}"}), 500
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
    """Run predictions on all possible peptides within the sequence with batched processing."""
    # Generate all valid peptides for the specified HLA class
    peptide_list = generate_peptides(sequence, hla_class)
    
    if not peptide_list:
        raise ValueError(f"No valid peptides could be generated for HLA class {hla_class} from the given sequence")
    
    # Process peptides in batches for better performance
    batch_size = 8  # Adjust based on your hardware
    predictions = []
    
    for i in range(0, len(peptide_list), batch_size):
        batch = peptide_list[i:i+batch_size]
        batch_predictions = process_peptide_batch(batch, hla_class)
        predictions.extend(batch_predictions)
    
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

def process_peptide_batch(peptide_batch, hla_class):
    """Process a batch of peptides at once for faster prediction."""
    results = []
    
    # Select model based on HLA class
    if hla_class == 'I':
        model = transHLA_I_model
        max_length = 16
    else:  # Class II
        model = transHLA_II_model
        max_length = 23
    
    # Prepare batch for processing
    peptide_sequences = [item['peptide'].upper() for item in peptide_batch]
    positions = [item['position'] for item in peptide_batch]
    lengths = [item['length'] for item in peptide_batch]
    
    # Tokenize all peptides in the batch
    batch_encoding = tokenizer(peptide_sequences)['input_ids']
    padded_encoding = pad_sequences(batch_encoding, max_length)
    
    # Convert to tensor and move to device
    input_tensor = torch.tensor(padded_encoding).to(device)
    
    # Get predictions for batch
    with torch.no_grad():
        outputs, representations = model(input_tensor)
    
    # Process outputs for each peptide in batch
    for i, (peptide, position, length) in enumerate(zip(peptide_sequences, positions, lengths)):
        probability = outputs[i][1].item()  # Probability of being an epitope
        is_epitope = probability > 0.5
        
        results.append({
            'peptide': peptide,
            'position': position,
            'length': length,
            'class': hla_class,
            'probability': probability,
            'is_epitope': is_epitope
        })
    
    return results

# Apply LRU cache to single peptide predictions for common peptides
@lru_cache(maxsize=256)
def _cached_prediction(peptide_seq, hla_class):
    """Cached version of the core prediction logic."""
    # Select model based on HLA class
    if hla_class == 'I':
        model = transHLA_I_model
        max_length = 16
    else:  # Class II
        model = transHLA_II_model
        max_length = 23
    
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
    
    return probability, label

def run_prediction(peptide_seq, hla_class='I'):
    """Run epitope prediction using TransHLA."""
    global tokenizer, transHLA_I_model, transHLA_II_model
    
    # Check if models are loaded
    if tokenizer is None or transHLA_I_model is None or transHLA_II_model is None:
        raise Exception("Models are not loaded properly")
        
    try:
        peptide_seq = peptide_seq.upper()
        
        # Select model based on HLA class
        if hla_class == 'I':
            max_length = 16
            
            # Validate peptide length for Class I
            if len(peptide_seq) < 8 or len(peptide_seq) > 14:
                print(f"Warning: Peptide length {len(peptide_seq)} may not be optimal for HLA Class I prediction")
        else:  # Class II
            max_length = 23
            
            # Validate peptide length for Class II
            if len(peptide_seq) < 13 or len(peptide_seq) > 21:
                print(f"Warning: Peptide length {len(peptide_seq)} may not be optimal for HLA Class II prediction")
        
        # Use the cached prediction
        probability, label = _cached_prediction(peptide_seq, hla_class)
        
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
        traceback.print_exc()
        raise Exception(f"Error during prediction: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True) 
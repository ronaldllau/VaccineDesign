import os
import sys
import json
import torch
import numpy as np
import pandas as pd
import traceback
import time
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModel
from werkzeug.utils import secure_filename

# Configure paths
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

app = Flask(__name__)
# Enable CORS for all routes when running in development
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Prediction cache
MAX_CACHE_SIZE = 100
prediction_cache = {}

# Model loading flag and instances
models_loaded = False
tokenizer = None
transHLA_I_model = None
transHLA_II_model = None

# Don't load models at startup to reduce initial memory usage
# Load them on-demand when needed
print("Models will be loaded on first prediction request")

def pad_sequences(sequences, max_length):
    """Pad sequences to a fixed length."""
    padded_sequences = []
    for seq in sequences:
        padding_length = max_length - len(seq)
        if padding_length > 0:
            seq.extend([1] * padding_length)
        padded_sequences.append(seq)
    return padded_sequences

def load_models():
    """Attempt to load the TransHLA models."""
    global tokenizer, transHLA_I_model, transHLA_II_model
    
    try:
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("facebook/esm2_t33_650M_UR50D")
        
        print("Loading TransHLA_I model...")
        transHLA_I_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_I", trust_remote_code=True)
        transHLA_I_model.to(device)
        transHLA_I_model.eval()
        
        print("Loading TransHLA_II model...")
        transHLA_II_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_II", trust_remote_code=True)
        transHLA_II_model.to(device)
        transHLA_II_model.eval()
        
        print("All models loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        traceback.print_exc()
        return False

def is_valid_peptide(peptide):
    """Check if a peptide contains only valid amino acid letters."""
    valid_aa = set("ACDEFGHIKLMNPQRSTVWY")
    return set(peptide.upper()).issubset(valid_aa)

def generate_peptides(sequence, hla_class, fixed_window_size=None):
    """Generate all possible peptides from a sequence based on HLA class.
    If fixed_window_size is provided, only generate peptides of that exact length."""
    sequence = sequence.upper()
    peptides = []
    
    # Define peptide length range based on HLA class
    if hla_class == "I":
        if fixed_window_size:
            length_range = [fixed_window_size]
        else:
            length_range = range(8, 15)  # 8-14 amino acids for Class I
    else:  # Class II
        if fixed_window_size:
            length_range = [fixed_window_size]
        else:
            length_range = range(13, 22)  # 13-21 amino acids for Class II
    
    # Generate all possible peptides within the length range
    for length in length_range:
        for i in range(len(sequence) - length + 1):
            peptide = sequence[i:i+length]
            if is_valid_peptide(peptide):
                peptides.append({
                    "peptide": peptide,
                    "position": i + 1,  # 1-indexed position
                    "length": length,
                    "class": hla_class
                })
    
    return peptides

def run_prediction(peptides, hla_class):
    """Run prediction for each peptide and return results."""
    results = []
    
    # Choose the appropriate model based on HLA class
    model = transHLA_I_model if hla_class == "I" else transHLA_II_model
    
    # Process peptides in batches for better performance
    batch_size = 32
    for i in range(0, len(peptides), batch_size):
        batch_peptides = peptides[i:i + batch_size]
        
        # Tokenize the batch
        batch_encoding = tokenizer([p["peptide"] for p in batch_peptides])['input_ids']
        
        # Pad sequences to appropriate length
        max_length = 16 if hla_class == "I" else 23
        padded_encoding = pad_sequences(batch_encoding, max_length)
        
        # Convert to tensor and move to device
        input_tensor = torch.tensor(padded_encoding).to(device)
        
        # Run the model
        with torch.no_grad():
            outputs, _ = model(input_tensor)
            
            # Process each prediction in the batch
            for j, peptide_data in enumerate(batch_peptides):
                probability = outputs[j][1].item()
                is_epitope = probability > 0.5
                
                results.append({
                    "peptide": peptide_data["peptide"],
                    "position": peptide_data["position"],
                    "length": peptide_data["length"],
                    "class": peptide_data["class"],
                    "probability": probability,
                    "is_epitope": is_epitope
                })
    
    return results

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        start_time = time.time()
        try:
            data = request.get_json()
            
            # Extract parameters
            sequence = data.get('sequence', '').strip().upper()
            mode = data.get('mode', 'single')
            hla_class = data.get('hla_class', 'I')
            use_fixed_window_size = data.get('useFixedWindowSize', False)
            window_size = data.get('windowSize') if use_fixed_window_size else None
            
            # Check if models are loaded
            global models_loaded, tokenizer, transHLA_I_model, transHLA_II_model
            if not models_loaded or tokenizer is None or transHLA_I_model is None or transHLA_II_model is None:
                # Try loading models one more time
                models_loaded = load_models()
                if not models_loaded:
                    return jsonify({'error': 'Models could not be loaded. Please check server logs.'}), 500
            
            # Validate sequence
            if not sequence:
                return jsonify({"error": "No peptide sequence provided"}), 400
            
            if not is_valid_peptide(sequence):
                return jsonify({"error": "Peptide contains invalid amino acid letters"}), 400
            
            # Single peptide mode
            if mode == 'single':
                # Generate cache key
                cache_key = f"single_{sequence}_{hla_class}"
                
                # Check if result is in cache
                if cache_key in prediction_cache:
                    print(f"Cache hit for {cache_key}")
                    return jsonify(prediction_cache[cache_key])
                
                # Validate peptide length
                if hla_class == 'I' and not (8 <= len(sequence) <= 14):
                    return jsonify({"error": "HLA class I peptides should be 8-14 amino acids long"}), 400
                
                if hla_class == 'II' and not (13 <= len(sequence) <= 21):
                    return jsonify({"error": "HLA class II peptides should be 13-21 amino acids long"}), 400
                
                # Run prediction
                peptides = [{"peptide": sequence, "position": 1, "length": len(sequence), "class": hla_class}]
                results = run_prediction(peptides, hla_class)
                
                response = {
                    "peptide": sequence,
                    "results": results
                }
                
                # Cache the result
                prediction_cache[cache_key] = response
                # Remove oldest entry if cache is full
                if len(prediction_cache) > MAX_CACHE_SIZE:
                    oldest_key = next(iter(prediction_cache))
                    del prediction_cache[oldest_key]
                
                print(f"Prediction completed in {time.time() - start_time:.2f} seconds")
                return jsonify(response)
            
            # Sliding window mode
            else:
                # Generate cache key, including window size if used
                cache_key = f"sliding_{sequence}_{hla_class}_{window_size if window_size else 'all'}"
                
                # Check if result is in cache
                if cache_key in prediction_cache:
                    print(f"Cache hit for {cache_key}")
                    return jsonify(prediction_cache[cache_key])
                
                # Process window_size if provided
                if window_size is not None:
                    window_size = int(window_size)
                    
                    # Validate window size
                    if hla_class == 'I' and not (8 <= window_size <= 14):
                        return jsonify({"error": "HLA class I window size should be 8-14 amino acids"}), 400
                    
                    if hla_class == 'II' and not (13 <= window_size <= 21):
                        return jsonify({"error": "HLA class II window size should be 13-21 amino acids"}), 400
                
                # Generate all peptides
                peptides = generate_peptides(sequence, hla_class, window_size)
                
                if not peptides:
                    return jsonify({"error": "No valid peptides could be generated from the input sequence"}), 400
                
                # Run prediction
                results = run_prediction(peptides, hla_class)
                
                # Count epitopes
                epitope_count = sum(1 for r in results if r["is_epitope"])
                
                response = {
                    "original_sequence": sequence,
                    "hla_class": hla_class,
                    "results": results,
                    "total_peptides": len(results),
                    "epitope_count": epitope_count,
                    "epitope_density": epitope_count / len(results) if results else 0
                }
                
                # Cache the result
                prediction_cache[cache_key] = response
                # Remove oldest entry if cache is full
                if len(prediction_cache) > MAX_CACHE_SIZE:
                    oldest_key = next(iter(prediction_cache))
                    del prediction_cache[oldest_key]
                
                print(f"Sliding window analysis completed in {time.time() - start_time:.2f} seconds")
                return jsonify(response)
        except Exception as e:
            print(f"Error in prediction: {str(e)}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

@app.route('/api/predict-structure', methods=['POST'])
def predict_structure():
    """
    Endpoint to predict 3D structure of a protein sequence using ESMFold API
    """
    if request.method == 'POST':
        try:
            data = request.get_json()
            sequence = data.get('sequence', '').strip().upper()
            
            # Validate sequence
            if not sequence:
                return jsonify({"error": "No protein sequence provided"}), 400
            
            if not is_valid_peptide(sequence):
                return jsonify({"error": "Protein sequence contains invalid amino acid letters"}), 400
            
            # Generate cache key
            cache_key = f"structure_{sequence}"
            
            # Check if result is in cache
            if cache_key in prediction_cache:
                print(f"Cache hit for {cache_key}")
                return jsonify(prediction_cache[cache_key])
            
            # Call ESMFold API
            try:
                api_url = "https://api.esmatlas.com/foldSequence/v1/pdb/"
                response = requests.post(api_url, data=sequence)
                
                if response.status_code != 200:
                    return jsonify({"error": f"ESMFold API error: {response.text}"}), 500
                
                # Get the PDB structure
                pdb_structure = response.text
                
                # Create response
                result = {
                    "sequence": sequence,
                    "pdb_structure": pdb_structure
                }
                
                # Cache the result
                prediction_cache[cache_key] = result
                # Remove oldest entry if cache is full
                if len(prediction_cache) > MAX_CACHE_SIZE:
                    oldest_key = next(iter(prediction_cache))
                    del prediction_cache[oldest_key]
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({"error": f"Error calling ESMFold API: {str(e)}"}), 500
                
        except Exception as e:
            return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint for the container
    """
    try:
        return jsonify({"status": "healthy"}), 200
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        # Still return 200 to keep the container running, 
        # but log the error for investigation
        return jsonify({"status": "degraded", "error": str(e)}), 200

# Serve static frontend files in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True) 
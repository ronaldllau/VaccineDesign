import torch
import traceback
import os
import sys

from transformers import AutoTokenizer, AutoModel

# Get the project root directory (parent of the app directory)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Model loader using device: {device}")

# Set cache directory paths
CACHE_DIR = os.path.join(PROJECT_ROOT, '.cache')
HF_CACHE_DIR = os.path.join(CACHE_DIR, 'huggingface')
TORCH_CACHE_DIR = os.path.join(CACHE_DIR, 'torch')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')

# Set environment variables for caching
os.environ["TRANSFORMERS_CACHE"] = HF_CACHE_DIR
os.environ["HF_HOME"] = HF_CACHE_DIR
os.environ["TORCH_HOME"] = TORCH_CACHE_DIR

# Create cache directories if they don't exist
try:
    os.makedirs(HF_CACHE_DIR, exist_ok=True)
    os.makedirs(os.path.join(TORCH_CACHE_DIR, 'hub/checkpoints'), exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"Cache directories created at {CACHE_DIR}")
except PermissionError as e:
    print(f"Warning: Permission error creating cache directories: {e}")
    print("Will attempt to use temporary directories instead")
    import tempfile
    temp_dir = tempfile.mkdtemp(prefix="transhla_")
    HF_CACHE_DIR = os.path.join(temp_dir, 'huggingface')
    TORCH_CACHE_DIR = os.path.join(temp_dir, 'torch')
    MODELS_DIR = os.path.join(temp_dir, 'models')
    os.makedirs(HF_CACHE_DIR, exist_ok=True)
    os.makedirs(os.path.join(TORCH_CACHE_DIR, 'hub/checkpoints'), exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.environ["TRANSFORMERS_CACHE"] = HF_CACHE_DIR
    os.environ["HF_HOME"] = HF_CACHE_DIR
    os.environ["TORCH_HOME"] = TORCH_CACHE_DIR
    print(f"Using temporary directories at {temp_dir}")

# Model instances
tokenizer = None
transHLA_I_model = None
transHLA_II_model = None
models_loaded = False

def load_models():
    """Attempt to load the TransHLA models."""
    global tokenizer, transHLA_I_model, transHLA_II_model, models_loaded
    
    try:
        print(f"Loading models with device: {device}")
        print(f"Using cache directory: {HF_CACHE_DIR}")
        
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("facebook/esm2_t33_650M_UR50D", cache_dir=HF_CACHE_DIR)
        
        print("Loading TransHLA_I model...")
        transHLA_I_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_I", trust_remote_code=True, cache_dir=HF_CACHE_DIR)
        transHLA_I_model.to(device)
        transHLA_I_model.eval()
        
        print("Loading TransHLA_II model...")
        transHLA_II_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_II", trust_remote_code=True, cache_dir=HF_CACHE_DIR)
        transHLA_II_model.to(device)
        transHLA_II_model.eval()
        
        models_loaded = True
        print("All models loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        traceback.print_exc()
        models_loaded = False
        return False

# Try to load models when this module is imported
load_models() 
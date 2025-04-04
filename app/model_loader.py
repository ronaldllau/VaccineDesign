import torch
import traceback
import os
from transformers import AutoTokenizer, AutoModel

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Model loader using device: {device}")

# Set cache directory paths
os.environ["TRANSFORMERS_CACHE"] = "/workspaces/VaccineDesign/.cache/huggingface"
os.environ["HF_HOME"] = "/workspaces/VaccineDesign/.cache/huggingface"

# Create cache directories if they don't exist
os.makedirs("/workspaces/VaccineDesign/.cache/huggingface", exist_ok=True)
os.makedirs("/workspaces/VaccineDesign/.cache/torch/hub/checkpoints", exist_ok=True)
os.makedirs("/workspaces/VaccineDesign/models", exist_ok=True)

# Model instances
tokenizer = None
transHLA_I_model = None
transHLA_II_model = None
models_loaded = False

def load_models():
    """Attempt to load the TransHLA models."""
    global tokenizer, transHLA_I_model, transHLA_II_model, models_loaded
    
    # Save the current working directory
    original_dir = os.getcwd()
    
    try:
        # Change to models directory to ensure models are saved there
        os.chdir("/workspaces/VaccineDesign/models")
        
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("facebook/esm2_t33_650M_UR50D", cache_dir="/workspaces/VaccineDesign/.cache/huggingface")
        
        print("Loading TransHLA_I model...")
        transHLA_I_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_I", trust_remote_code=True, cache_dir="/workspaces/VaccineDesign/.cache/huggingface")
        transHLA_I_model.to(device)
        transHLA_I_model.eval()
        
        print("Loading TransHLA_II model...")
        transHLA_II_model = AutoModel.from_pretrained("SkywalkerLu/TransHLA_II", trust_remote_code=True, cache_dir="/workspaces/VaccineDesign/.cache/huggingface")
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
    finally:
        # Change back to the original directory
        os.chdir(original_dir)

# Try to load models when this module is imported
load_models() 
# Apply PyTorch JIT fixes to avoid 'undefined symbol' errors
import os
import sys

# Disable JIT profiling to avoid undefined symbol errors
os.environ['PYTORCH_JIT'] = '0'
os.environ['PYTORCH_DISABLE_JIT_PROFILING'] = '1'

# Check if fix module exists and import it
try:
    from fix_torch_jit import apply_fix
    apply_fix()
except ImportError:
    # Apply basic fixes manually
    print("JIT fix module not found, applying basic fixes")

# Import the Flask app after fixes
from app.app import app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    try:
        # Ensure static directory exists
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static')
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)
            logger.info(f"Created static directory at {static_dir}")

        # Use host='0.0.0.0' to make the app accessible from outside the container
        logger.info("Starting server on port 8080...")
        app.run(debug=False, host='0.0.0.0', port=8080)
    except Exception as e:
        logger.error(f"Failed to start Flask application: {str(e)}")
        raise 
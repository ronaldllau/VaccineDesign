# Apply PyTorch JIT fixes to avoid potential runtime errors
import os
import sys
import logging
import argparse

# Configure environment variables
os.environ['PYTORCH_JIT'] = '0'
os.environ['PYTORCH_DISABLE_JIT_PROFILING'] = '1'

# Import the Flask app
from app.app import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Start the TransHLA Flask application')
    parser.add_argument('--port', type=int, default=int(os.environ.get('FLASK_PORT', 8080)),
                        help='Port to run the server on (default: 8080)')
    parser.add_argument('--host', type=str, default=os.environ.get('FLASK_HOST', '0.0.0.0'),
                        help='Host interface to listen on (default: 0.0.0.0 - all interfaces)')
    args = parser.parse_args()
    port = args.port
    host = args.host

    logger.info("Starting Flask application...")
    try:
        # Ensure static directory exists
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static')
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)
            logger.info(f"Created static directory at {static_dir}")

        # Use host='0.0.0.0' to make the app accessible from outside the container
        logger.info(f"Starting server on {host}:{port}...")
        app.run(debug=False, host=host, port=port)
    except Exception as e:
        logger.error(f"Failed to start Flask application: {str(e)}")
        raise 
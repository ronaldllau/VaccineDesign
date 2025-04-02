from app.app import app
import logging
import os

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
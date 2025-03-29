from app.app import app

if __name__ == '__main__':
    # Use host='0.0.0.0' to make the app accessible from outside the container
    app.run(debug=False, host='0.0.0.0', port=8080) 
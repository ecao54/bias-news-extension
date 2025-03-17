#!/bin/bash
source venv/bin/activate

# Download required NLTK data first
echo "Setting up NLTK data..."
python setup_nltk.py

# Run the improved Flask app
export FLASK_APP=app_improved.py
export FLASK_ENV=development
export FLASK_PORT=5001
python app_improved.py 
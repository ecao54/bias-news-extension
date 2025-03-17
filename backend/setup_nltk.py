#!/usr/bin/env python
"""
NLTK Data Setup Script
This script ensures that all required NLTK data packages are downloaded.
Run this script before starting the application.
"""

import nltk
import sys

def setup_nltk():
    """Download required NLTK datasets"""
    required_packages = [
        'punkt',
        'stopwords',
        'wordnet',
        'vader_lexicon'
    ]
    
    print("Downloading required NLTK data packages...")
    for package in required_packages:
        try:
            print(f"Downloading {package}...")
            nltk.download(package)
        except Exception as e:
            print(f"Error downloading {package}: {e}")
            return False
    
    print("NLTK setup complete!")
    return True

if __name__ == "__main__":
    success = setup_nltk()
    sys.exit(0 if success else 1) 
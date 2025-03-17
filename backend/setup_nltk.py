#!/usr/bin/env python
"""
NLTK Data Setup Script
This script ensures that all required NLTK data packages are downloaded.
Run this script before starting the application.
"""

import sys

try:
    import nltk
    print("NLTK successfully imported.")
except ImportError as e:
    print(f"Error importing NLTK: {e}")
    print("Please make sure NLTK is installed correctly.")
    sys.exit(1)

def setup_nltk():
    """Download required NLTK datasets"""
    required_packages = [
        'punkt',
        'stopwords',
        'wordnet',
        'vader_lexicon'
    ]
    
    print("Downloading required NLTK data packages...")
    success = True
    
    for package in required_packages:
        try:
            print(f"Downloading {package}...")
            nltk.download(package, quiet=True)
            print(f"Successfully downloaded {package}")
        except Exception as e:
            print(f"Error downloading {package}: {e}")
            print("This may affect some functionality, but we'll continue.")
            success = False
    
    if success:
        print("NLTK setup complete!")
    else:
        print("NLTK setup completed with some issues.")
    
    return success

if __name__ == "__main__":
    try:
        success = setup_nltk()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Unexpected error during NLTK setup: {e}")
        sys.exit(1) 
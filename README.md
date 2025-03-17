# Bias & Fake News Detector

A Chrome extension that analyzes news articles for political bias, sentiment, and objectivity.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Extracts article text from news websites
- Analyzes political bias (left vs. right leaning)
- Measures sentiment (positive vs. negative)
- Evaluates objectivity (factual vs. opinionated)
- Provides an overall assessment of the article
- Includes specific examples from the text to justify scores
- Topic analysis breakdown for political content
- Moral foundations analysis for deeper political understanding

## Project Structure

This project consists of two main components:

1. **Chrome Extension**: Frontend that extracts article text and displays analysis results
2. **Flask Backend**: Python-based API that performs the bias analysis

## Installation

### Prerequisites

- Python 3.7+
- pip (Python package manager)
- Google Chrome browser

### Backend Setup

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/bias-news-extension.git
   cd bias-news-extension
   ```

2. Navigate to the backend directory:

   ```
   cd backend
   ```

3. Create and activate a virtual environment:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

4. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

5. Set up environment variables:

   ```
   cp .env.example .env
   ```

6. Download required NLTK data:

   ```
   python setup_nltk.py
   ```

7. Run the Flask application:

   ```
   ./run_backend.sh  # For basic analysis
   # OR
   ./run_improved.sh  # For advanced analysis (port 5001)
   ```

   The standard server will start at http://localhost:5000
   The improved server will start at http://localhost:5001

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the root directory of this project
4. The extension should now be installed and visible in your Chrome toolbar

## Usage

1. Navigate to any news article
2. Click the extension icon in your Chrome toolbar
3. Click the "Analyze Article" button
4. View the bias, sentiment, and objectivity analysis results
5. Review specific examples from the text that justify each score
6. Check topic analysis and moral foundations for deeper insights

## Technical Details

The analysis uses:

- NLTK for sentiment analysis and tokenization
- TextBlob for subjectivity analysis
- Custom keyword matching for political bias detection
- Topic-specific analysis for different political domains
- Moral Foundations Theory for deeper political understanding

## Screenshots

[Add screenshots here once the extension is complete]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Future Improvements

- Enhanced bias detection using machine learning models
- Support for more languages
- Historical tracking of news sources
- Customizable bias detection thresholds
- Browser extension for Firefox and other browsers

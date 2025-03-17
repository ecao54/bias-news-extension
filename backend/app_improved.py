from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import os
import re
import logging
import sys

# Import our improved bias analyzer
from improved_bias_analyzer import ImprovedBiasAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to download necessary NLTK data, but handle failures gracefully
try:
    # Download necessary NLTK data
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    logger.info("NLTK data downloaded successfully")
except Exception as e:
    logger.warning(f"Error downloading NLTK data: {e}")
    logger.warning("Some functionality may be limited. Run setup_nltk.py to download required data.")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize our bias analyzer
try:
    bias_analyzer = ImprovedBiasAnalyzer()
    logger.info("ImprovedBiasAnalyzer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize ImprovedBiasAnalyzer: {e}")
    logger.error("Using fallback analysis methods")
    bias_analyzer = None

def analyze_sentiment(text):
    """
    Analyze sentiment using NLTK's SentimentIntensityAnalyzer
    Returns a score between -1 (negative) and 1 (positive)
    """
    try:
        sia = SentimentIntensityAnalyzer()
        sentiment_scores = sia.polarity_scores(text)
        return sentiment_scores['compound']
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        # Fallback to a simple approach if NLTK fails
        return 0.0  # Neutral sentiment as fallback

def analyze_subjectivity(text):
    """
    Analyze subjectivity using TextBlob
    Returns a score between 0 (objective) and 1 (subjective)
    """
    try:
        blob = TextBlob(text)
        return blob.sentiment.subjectivity
    except Exception as e:
        logger.error(f"Error in subjectivity analysis: {e}")
        return 0.5  # Middle value as fallback

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    article_text = data['text']
    
    # Basic validation - check if we have enough text to analyze
    if len(article_text.split()) < 10:
        return jsonify({"error": "Text is too short for meaningful analysis"}), 400
    
    try:
        # Perform multiple analysis methods
        # Use our improved political bias analyzer
        if bias_analyzer:
            bias_analysis = bias_analyzer.analyze(article_text)
        else:
            bias_analysis = {}
        
        # Get political bias score from the improved analyzer
        political_bias = bias_analysis.get("bias_score", 0.0)
        bias_confidence = bias_analysis.get("confidence", 0.0)
        bias_interpretation = bias_analysis.get("interpretation", "Neutral")
        bias_explanation = bias_analysis.get("explanation", "")
        topic_analysis = bias_analysis.get("topic_analysis", {})
        moral_foundations = bias_analysis.get("moral_foundations", {})
        
        # These analyses remain the same as before
        sentiment = analyze_sentiment(article_text)
        subjectivity = analyze_subjectivity(article_text)
        
        # Interpret the sentiment score
        sentiment_interpretation = "Neutral"
        if sentiment < -0.3:
            sentiment_interpretation = "Negative"
        elif sentiment > 0.3:
            sentiment_interpretation = "Positive"
        
        # Interpret the subjectivity score
        objectivity_interpretation = "Balanced"
        if subjectivity < 0.3:
            objectivity_interpretation = "Mostly factual"
        elif subjectivity > 0.7:
            objectivity_interpretation = "Highly opinionated"
        
        # Build the enhanced response
        response = {
            "bias": {
                "score": political_bias,
                "interpretation": bias_interpretation,
                "confidence": bias_confidence,
                "explanation": bias_explanation,
                "topic_analysis": topic_analysis,
                "moral_foundations": moral_foundations
            },
            "sentiment": {
                "score": sentiment,
                "interpretation": sentiment_interpretation
            },
            "objectivity": {
                "score": 1 - subjectivity,
                "interpretation": objectivity_interpretation
            },
            "overall_assessment": f"This article appears to be {bias_interpretation.lower()}, with a {sentiment_interpretation.lower()} tone. It is {objectivity_interpretation.lower()} in its presentation."
        }
        
        return jsonify(response)
    except Exception as e:
        app.logger.error(f"Error analyzing text: {str(e)}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port) 
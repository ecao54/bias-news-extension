# Bias News Analysis Backend

This Flask-based backend analyzes news articles for political bias, sentiment, and objectivity.

## Features

- Analyzes political bias (left vs. right leaning)
- Measures sentiment (positive vs. negative)
- Evaluates objectivity (factual vs. opinionated)
- Provides overall assessment

## Setup Instructions

1. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Set up environment variables:

   ```
   cp .env.example .env
   ```

3. Run the Flask application:
   ```
   python app.py
   ```

The server will start at http://localhost:5000

## API Endpoints

### POST /api/analyze

Analyze text for bias, sentiment, and objectivity.

#### Request Body

```json
{
  "text": "Your article text here..."
}
```

#### Response Format

```json
{
  "bias": {
    "score": 0.25,
    "interpretation": "Right-leaning"
  },
  "sentiment": {
    "score": 0.75,
    "interpretation": "Positive"
  },
  "objectivity": {
    "score": 0.35,
    "interpretation": "Balanced"
  },
  "overall_assessment": "This article appears to be right-leaning, with a positive tone. It is balanced in its presentation."
}
```

## Technical Details

The analysis uses:

- NLTK for sentiment analysis
- TextBlob for subjectivity analysis
- Custom keyword matching for political bias detection

"""
Improved Bias Analyzer

A more sophisticated approach to political bias detection that can be implemented immediately,
without requiring extensive model training.
"""

import re
import nltk
import logging
from collections import Counter
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import NLTK resources, but handle failures gracefully
try:
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    NLTK_AVAILABLE = True
    logger.info("NLTK resources loaded successfully")
except Exception as e:
    logger.warning(f"Error loading NLTK resources: {e}")
    logger.warning("Using simplified analysis methods")
    NLTK_AVAILABLE = False
    
    # Define a minimal stopwords set for fallback
    class MinimalStopwords:
        def words(self, lang=None):
            return ['a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
                   'at', 'from', 'by', 'for', 'with', 'about', 'against', 'between',
                   'into', 'through', 'during', 'before', 'after', 'above', 'below',
                   'to', 'of', 'in', 'on', 'is', 'are', 'was', 'were', 'be', 'been',
                   'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
                   'doing', 'this', 'that', 'these', 'those', 'would', 'should', 'could',
                   'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who']
    
    # Create fallback stopwords
    stopwords = MinimalStopwords()

class ImprovedBiasAnalyzer:
    def __init__(self):
        # Load our extended lexicons
        self.lexicons = self._load_lexicons()
        
        # Define framing patterns
        self.framing_patterns = {
            "left_frames": [
                r"economic inequality",
                r"systemic (racism|discrimination)",
                r"(human|civil) rights",
                r"(undocumented|unauthorized) immigrants",
                r"climate (crisis|emergency)",
                r"(worker|labor) rights",
                r"(affordable|universal) healthcare",
                r"corporate greed",
            ],
            "right_frames": [
                r"free market",
                r"personal responsibility",
                r"(illegal|undocumented) aliens",
                r"family values",
                r"job creators",
                r"government overreach",
                r"religious (freedom|liberty)",
                r"law and order",
            ]
        }
        
        # Load moral foundations lexicon (would be loaded from files in a real implementation)
        self.moral_foundations = {
            "care": ["harm", "care", "protect", "compassion", "empathy"],
            "fairness": ["fair", "equal", "justice", "rights", "equity"],
            "loyalty": ["loyal", "solidarity", "patriot", "betray", "treason"],
            "authority": ["authority", "tradition", "respect", "obey", "order"],
            "sanctity": ["purity", "sacred", "disgust", "sin", "degradation"],
            "liberty": ["freedom", "liberty", "oppress", "tyranny", "restrict"]
        }
        
        # Initialize TF-IDF vectorizer for source comparison
        self.tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
        
        # These would be actual article data in a real implementation
        self.reference_articles = {
            "left": ["Democratic policies aim to address inequality and climate change."],
            "center": ["Both parties have proposed solutions to address economic challenges."],
            "right": ["Conservative approaches focus on free market solutions and limited government."]
        }
    
    def _load_lexicons(self):
        """
        Load political lexicons (in real implementation, these would be loaded from files)
        This is a greatly enhanced version of the simple term lists in the original implementation.
        """
        return {
            # Economic concepts
            "economy_left": ["regulation", "inequality", "living wage", "worker protection", 
                             "economic justice", "wealth tax", "social safety net", "public investment"],
            
            "economy_right": ["deregulation", "free market", "tax cut", "fiscal responsibility", 
                              "job creator", "economic freedom", "private sector", "trickle-down"],
            
            # Social issues
            "social_left": ["reproductive rights", "LGBTQ+ rights", "racial justice", "diversity", 
                            "inclusion", "marginalized communities", "systemic racism", "police reform"],
            
            "social_right": ["traditional values", "family values", "religious freedom", "law and order", 
                             "western civilization", "patriotism", "moral decay", "unborn"],
            
            # Health care
            "healthcare_left": ["universal healthcare", "single-payer", "affordable care act", "medicare for all", 
                                "public option", "healthcare equity", "prescription drug prices", "mental health care"],
            
            "healthcare_right": ["market-based healthcare", "health savings accounts", "private insurance", 
                                 "personal responsibility", "choice in healthcare", "individual mandate", "rationing"],
            
            # Environment
            "environment_left": ["climate crisis", "green new deal", "renewable energy", "environmental justice", 
                                 "carbon tax", "sustainability", "pollution control", "conservation"],
            
            "environment_right": ["environmental overregulation", "clean coal", "energy independence", 
                                  "job-killing regulations", "climate alarmism", "property rights", "nuclear power"],
            
            # Immigration
            "immigration_left": ["pathway to citizenship", "dreamers", "asylum seekers", "family reunification", 
                                 "undocumented immigrants", "immigration reform", "sanctuary cities"],
            
            "immigration_right": ["border security", "illegal immigration", "merit-based immigration", 
                                  "chain migration", "illegal aliens", "amnesty", "vetting", "deportation"],
            
            # Foreign policy
            "foreign_left": ["diplomacy", "international cooperation", "human rights", "foreign aid", 
                             "peacekeeping", "multilateral", "united nations", "soft power"],
            
            "foreign_right": ["strong military", "america first", "national security", "defense spending", 
                              "sovereignty", "strength", "terrorism", "interventionism", "isolationism"]
        }
    
    def _count_lexicon_terms(self, text, lexicons):
        """Count occurrences of terms from each lexicon category"""
        text = text.lower()
        results = {}
        
        for category, terms in lexicons.items():
            count = 0
            for term in terms:
                # Look for whole words or phrases
                pattern = r'\b' + re.escape(term) + r'\b'
                count += len(re.findall(pattern, text))
            results[category] = count
            
        return results
    
    def _analyze_framing(self, text):
        """Analyze narrative framing techniques in the text"""
        text = text.lower()
        results = {"left_frames": 0, "right_frames": 0}
        
        for frame_type, patterns in self.framing_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text)
                results[frame_type] += len(matches)
                
        return results
    
    def _analyze_moral_foundations(self, text):
        """Analyze text using Moral Foundations Theory"""
        text = text.lower()
        
        try:
            # Try to use full NLTK functionality if available
            if NLTK_AVAILABLE:
                tokens = word_tokenize(text)
                stopwords_set = set(stopwords.words('english'))
            else:
                # Fall back to simple splitting if NLTK is not available
                tokens = text.split()
                stopwords_set = set(stopwords.words())
                
            tokens = [t for t in tokens if t not in stopwords_set]
            
            results = {}
            for foundation, terms in self.moral_foundations.items():
                count = sum(1 for token in tokens if token in terms)
                results[foundation] = count
                
            # Normalize the results
            total = sum(results.values())
            if total > 0:
                for foundation in results:
                    results[foundation] = results[foundation] / total
            
            return results
        except Exception as e:
            logger.error(f"Error in moral foundations analysis: {e}")
            # Return empty results if analysis fails
            return {foundation: 0.0 for foundation in self.moral_foundations}
    
    def _compare_to_reference_sources(self, text):
        """Compare the text to known reference sources"""
        # In a real implementation, this would use pre-computed embeddings or TF-IDF vectors
        # For this example, we'll just do a simple TF-IDF similarity
        
        all_texts = [text]
        for category, articles in self.reference_articles.items():
            all_texts.extend(articles)
            
        tfidf_matrix = self.tfidf.fit_transform(all_texts)
        
        # Calculate similarity between input text and each reference category
        similarities = {}
        input_vector = tfidf_matrix[0]
        
        offset = 1
        for category, articles in self.reference_articles.items():
            category_vectors = tfidf_matrix[offset:offset+len(articles)]
            offset += len(articles)
            
            # Calculate cosine similarity (simplified here)
            similarity = np.mean([
                (input_vector.dot(article_vector.T) / 
                 (np.sqrt(input_vector.dot(input_vector.T)) * np.sqrt(article_vector.dot(article_vector.T))))
                for article_vector in category_vectors
            ])
            
            similarities[category] = float(similarity)
            
        return similarities
    
    def analyze(self, text):
        """
        Analyze political bias using multiple techniques
        """
        if not text or len(text.strip()) < 50:
            return {
                "bias_score": 0,
                "confidence": 0.1,
                "explanation": "Text is too short for reliable analysis."
            }
        
        # 1. Analyze lexicon term usage
        lexicon_results = self._count_lexicon_terms(text, self.lexicons)
        
        # 2. Analyze framing techniques
        framing_results = self._analyze_framing(text)
        
        # 3. Analyze moral foundations
        moral_results = self._analyze_moral_foundations(text)
        
        # 4. Compare to reference sources (would be more sophisticated in a real implementation)
        # reference_similarities = self._compare_to_reference_sources(text)
        
        # Calculate economic bias score
        left_economic = lexicon_results.get("economy_left", 0)
        right_economic = lexicon_results.get("economy_right", 0)
        
        # Calculate social issues bias score
        left_social = lexicon_results.get("social_left", 0)
        right_social = lexicon_results.get("social_right", 0)
        
        # Calculate environmental bias score
        left_environmental = lexicon_results.get("environment_left", 0)
        right_environmental = lexicon_results.get("environment_right", 0)
        
        # Calculate healthcare bias score
        left_healthcare = lexicon_results.get("healthcare_left", 0)
        right_healthcare = lexicon_results.get("healthcare_right", 0)
        
        # Calculate immigration bias score
        left_immigration = lexicon_results.get("immigration_left", 0)
        right_immigration = lexicon_results.get("immigration_right", 0)
        
        # Calculate foreign policy bias score
        left_foreign = lexicon_results.get("foreign_left", 0)
        right_foreign = lexicon_results.get("foreign_right", 0)
        
        # Calculate framing bias
        left_framing = framing_results.get("left_frames", 0)
        right_framing = framing_results.get("right_frames", 0)
        
        # Calculate total counts
        total_left = (left_economic + left_social + left_environmental + 
                      left_healthcare + left_immigration + left_foreign + left_framing)
        
        total_right = (right_economic + right_social + right_environmental + 
                       right_healthcare + right_immigration + right_foreign + right_framing)
        
        total_terms = total_left + total_right
        
        # Calculate bias score (from -1 liberal to 1 conservative)
        if total_terms > 0:
            bias_score = (total_right - total_left) / total_terms
        else:
            bias_score = 0
            
        # Calculate confidence based on total term count
        confidence = min(0.9, max(0.3, min(total_terms / 20, 0.9)))
        
        # Determine bias category
        bias_category = "Neutral"
        if bias_score < -0.6:
            bias_category = "Strongly Left-leaning"
        elif bias_score < -0.3:
            bias_category = "Moderately Left-leaning"
        elif bias_score < -0.1:
            bias_category = "Slightly Left-leaning"
        elif bias_score <= 0.1:
            bias_category = "Neutral"
        elif bias_score <= 0.3:
            bias_category = "Slightly Right-leaning"
        elif bias_score <= 0.6:
            bias_category = "Moderately Right-leaning"
        else:
            bias_category = "Strongly Right-leaning"
            
        # Calculate morality profile
        moral_profile = {}
        total_moral = sum(moral_results.values())
        if total_moral > 0:
            for foundation, count in moral_results.items():
                moral_profile[foundation] = count / total_moral
        
        # Generate detailed explanation
        topic_bias = {}
        
        # Economic bias
        if left_economic + right_economic > 0:
            economic_bias = (right_economic - left_economic) / (left_economic + right_economic)
            topic_bias["economic"] = {
                "score": economic_bias,
                "left_terms": left_economic,
                "right_terms": right_economic
            }
        
        # Social issues bias
        if left_social + right_social > 0:
            social_bias = (right_social - left_social) / (left_social + right_social)
            topic_bias["social"] = {
                "score": social_bias,
                "left_terms": left_social,
                "right_terms": right_social
            }
            
        # Add other topics similarly
        
        # Generate explanation
        explanation = f"This content appears to be {bias_category.lower()}, "
        
        # Add topic-specific explanations
        if "economic" in topic_bias:
            economic_leaning = "right-leaning" if topic_bias["economic"]["score"] > 0 else "left-leaning"
            explanation += f"with {economic_leaning} economic framing. "
            
        if "social" in topic_bias:
            social_leaning = "right-leaning" if topic_bias["social"]["score"] > 0 else "left-leaning"
            explanation += f"Social issues are presented with a {social_leaning} perspective. "
        
        # Add moral foundations information
        if moral_profile:
            # Find dominant moral foundation
            dominant_foundation = max(moral_profile, key=moral_profile.get)
            if moral_profile[dominant_foundation] > 0.3:
                explanation += f"The content emphasizes the moral foundation of {dominant_foundation}. "
        
        # Add confidence statement
        if confidence < 0.5:
            explanation += "Note that this analysis has low confidence due to limited political indicators in the text."
            
        return {
            "bias_score": bias_score,
            "confidence": confidence,
            "interpretation": bias_category,
            "topic_analysis": topic_bias,
            "moral_foundations": moral_profile,
            "explanation": explanation.strip()
        }

# Example usage
# analyzer = ImprovedBiasAnalyzer()
# result = analyzer.analyze("Article text goes here...")
# print(json.dumps(result, indent=2)) 
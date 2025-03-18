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
            "economy_left": [
                "regulation", "inequality", "living wage", "worker protection", 
                "economic justice", "wealth tax", "social safety net", "public investment",
                "minimum wage", "labor unions", "worker rights", "corporate greed",
                "wealth redistribution", "progressive tax", "public services",
                "economic fairness", "worker solidarity", "corporate accountability",
                "economic democracy", "public ownership", "social welfare",
                "economic inequality", "wealth gap", "corporate welfare",
                "economic reform", "worker empowerment", "fair wages",
                "economic justice", "public infrastructure", "social programs"
            ],
            
            "economy_right": [
                "deregulation", "free market", "tax cut", "fiscal responsibility", 
                "job creator", "economic freedom", "private sector", "trickle-down",
                "small government", "fiscal conservatism", "market forces",
                "economic growth", "business friendly", "entrepreneurship",
                "private enterprise", "free enterprise", "economic liberty",
                "market competition", "fiscal restraint", "business regulation",
                "economic opportunity", "job growth", "market efficiency",
                "economic prosperity", "private investment", "business climate",
                "economic stability", "market solutions", "fiscal discipline"
            ],
            
            # Social issues
            "social_left": [
                "reproductive rights", "LGBTQ+ rights", "racial justice", "diversity", 
                "inclusion", "marginalized communities", "systemic racism", "police reform",
                "social justice", "civil rights", "gender equality", "social equity",
                "racial equality", "social progress", "human rights", "social change",
                "community empowerment", "social inclusion", "racial equity",
                "gender equity", "social reform", "civil liberties", "social equality",
                "community justice", "social empowerment", "racial progress",
                "gender justice", "social transformation", "civil rights movement"
            ],
            
            "social_right": [
                "traditional values", "family values", "religious freedom", "law and order", 
                "western civilization", "patriotism", "moral decay", "unborn",
                "cultural heritage", "family structure", "moral values", "social stability",
                "traditional marriage", "cultural preservation", "national identity",
                "moral standards", "social order", "cultural values", "family tradition",
                "moral principles", "social cohesion", "cultural identity", "national pride",
                "moral foundation", "social harmony", "cultural tradition", "family values",
                "moral compass", "social fabric", "cultural heritage"
            ],
            
            # Health care
            "healthcare_left": [
                "universal healthcare", "single-payer", "affordable care act", "medicare for all", 
                "public option", "healthcare equity", "prescription drug prices", "mental health care",
                "healthcare access", "healthcare reform", "public health", "healthcare justice",
                "healthcare rights", "healthcare equality", "healthcare affordability",
                "healthcare coverage", "healthcare system", "healthcare policy",
                "healthcare support", "healthcare assistance", "healthcare benefits",
                "healthcare protection", "healthcare security", "healthcare provision",
                "healthcare services", "healthcare resources", "healthcare programs",
                "healthcare funding", "healthcare investment", "healthcare infrastructure"
            ],
            
            "healthcare_right": [
                "market-based healthcare", "health savings accounts", "private insurance", 
                "personal responsibility", "choice in healthcare", "individual mandate", "rationing",
                "healthcare choice", "private healthcare", "healthcare freedom",
                "healthcare competition", "healthcare innovation", "healthcare efficiency",
                "healthcare quality", "healthcare options", "healthcare market",
                "healthcare consumer", "healthcare provider", "healthcare cost",
                "healthcare reform", "healthcare system", "healthcare policy",
                "healthcare access", "healthcare coverage", "healthcare benefits",
                "healthcare services", "healthcare resources", "healthcare programs",
                "healthcare funding", "healthcare investment", "healthcare infrastructure"
            ],
            
            # Environment
            "environment_left": [
                "climate crisis", "green new deal", "renewable energy", "environmental justice", 
                "carbon tax", "sustainability", "pollution control", "conservation",
                "climate action", "environmental protection", "clean energy",
                "climate change", "environmental policy", "green technology",
                "climate policy", "environmental regulation", "renewable resources",
                "climate solutions", "environmental impact", "green initiatives",
                "climate adaptation", "environmental awareness", "sustainable development",
                "climate mitigation", "environmental conservation", "green economy",
                "climate resilience", "environmental stewardship", "sustainable future"
            ],
            
            "environment_right": [
                "environmental overregulation", "clean coal", "energy independence", 
                "job-killing regulations", "climate alarmism", "property rights", "nuclear power",
                "energy security", "environmental balance", "economic growth",
                "energy development", "environmental management", "resource utilization",
                "energy production", "environmental stewardship", "economic prosperity",
                "energy innovation", "environmental science", "resource conservation",
                "energy efficiency", "environmental policy", "economic opportunity",
                "energy technology", "environmental protection", "resource management",
                "energy infrastructure", "environmental regulation", "economic development"
            ],
            
            # Immigration
            "immigration_left": [
                "pathway to citizenship", "dreamers", "asylum seekers", "family reunification", 
                "undocumented immigrants", "immigration reform", "sanctuary cities",
                "immigration rights", "refugee protection", "immigration justice",
                "immigration policy", "refugee rights", "immigration support",
                "immigration assistance", "refugee assistance", "immigration services",
                "immigration protection", "refugee support", "immigration resources",
                "immigration programs", "refugee programs", "immigration benefits",
                "immigration rights", "refugee rights", "immigration support",
                "immigration assistance", "refugee assistance", "immigration services"
            ],
            
            "immigration_right": [
                "border security", "illegal immigration", "merit-based immigration", 
                "chain migration", "illegal aliens", "amnesty", "vetting", "deportation",
                "immigration control", "border protection", "immigration enforcement",
                "immigration policy", "border security", "immigration regulation",
                "immigration law", "border control", "immigration security",
                "immigration system", "border enforcement", "immigration rules",
                "immigration standards", "border management", "immigration requirements",
                "immigration process", "border patrol", "immigration screening",
                "immigration verification", "border control", "immigration checks"
            ],
            
            # Foreign policy
            "foreign_left": [
                "diplomacy", "international cooperation", "human rights", "foreign aid", 
                "peacekeeping", "multilateral", "united nations", "soft power",
                "international relations", "global cooperation", "peace diplomacy",
                "international law", "global governance", "peace building",
                "international aid", "global partnership", "peace initiatives",
                "international support", "global development", "peace process",
                "international engagement", "global security", "peace negotiations",
                "international dialogue", "global stability", "peace efforts",
                "international collaboration", "global peace", "peace resolution"
            ],
            
            "foreign_right": [
                "strong military", "america first", "national security", "defense spending", 
                "sovereignty", "strength", "terrorism", "interventionism", "isolationism",
                "military strength", "national defense", "security policy",
                "military power", "national interest", "security measures",
                "military capability", "national sovereignty", "security strategy",
                "military readiness", "national protection", "security forces",
                "military presence", "national security", "security operations",
                "military defense", "national strength", "security systems",
                "military force", "national power", "security framework"
            ],

            # Education
            "education_left": [
                "public education", "education equity", "student rights", "education funding",
                "public schools", "education access", "student support", "education resources",
                "education reform", "student success", "education programs",
                "education policy", "student achievement", "education services",
                "education support", "student development", "education opportunities",
                "education system", "student learning", "education quality",
                "education rights", "student welfare", "education benefits",
                "education assistance", "student assistance", "education programs",
                "education investment", "student support", "education development"
            ],

            "education_right": [
                "school choice", "education freedom", "parental rights", "education standards",
                "private education", "education quality", "parental control", "education excellence",
                "education reform", "student achievement", "parental involvement",
                "education policy", "student success", "parental choice",
                "education system", "student learning", "parental authority",
                "education standards", "student development", "parental responsibility",
                "education quality", "student performance", "parental guidance",
                "education accountability", "student progress", "parental influence",
                "education innovation", "student growth", "parental engagement"
            ],

            # Criminal Justice
            "criminal_justice_left": [
                "criminal justice reform", "police accountability", "prison reform",
                "restorative justice", "criminal justice system", "police oversight",
                "prison rehabilitation", "justice reform", "police transparency",
                "prison alternatives", "criminal justice policy", "police training",
                "prison conditions", "justice system", "police reform",
                "prison population", "criminal justice change", "police practices",
                "prison programs", "justice initiatives", "police community",
                "prison services", "criminal justice progress", "police relations",
                "prison resources", "justice programs", "police accountability",
                "prison support", "criminal justice rights", "police oversight"
            ],

            "criminal_justice_right": [
                "law and order", "tough on crime", "police support", "criminal justice",
                "public safety", "crime prevention", "police protection", "justice system",
                "crime control", "law enforcement", "police authority", "criminal law",
                "public security", "crime reduction", "police power", "legal system",
                "crime deterrence", "law compliance", "police force", "criminal code",
                "public order", "crime fighting", "police presence", "legal framework",
                "crime prevention", "law maintenance", "police service", "criminal justice",
                "public protection", "crime control", "police action", "legal authority"
            ],

            # Technology
            "technology_left": [
                "digital privacy", "net neutrality", "tech regulation", "data protection",
                "digital rights", "internet freedom", "tech accountability", "privacy rights",
                "digital access", "tech innovation", "data security", "privacy protection",
                "digital inclusion", "tech development", "data privacy", "privacy laws",
                "digital equity", "tech progress", "data rights", "privacy standards",
                "digital literacy", "tech advancement", "data control", "privacy framework",
                "digital rights", "tech growth", "data protection", "privacy measures",
                "digital access", "tech evolution", "data security", "privacy safeguards"
            ],

            "technology_right": [
                "tech innovation", "digital freedom", "market competition", "tech growth",
                "digital enterprise", "tech development", "market forces", "tech advancement",
                "digital progress", "tech industry", "market opportunity", "tech evolution",
                "digital future", "tech leadership", "market innovation", "tech progress",
                "digital economy", "tech sector", "market development", "tech expansion",
                "digital transformation", "tech capability", "market potential", "tech potential",
                "digital opportunity", "tech capacity", "market growth", "tech growth",
                "digital innovation", "tech advancement", "market expansion", "tech development"
            ]
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
        
        # Calculate bias scores for each category
        categories = {
            "economic": ("economy_left", "economy_right"),
            "social": ("social_left", "social_right"),
            "environmental": ("environment_left", "environment_right"),
            "healthcare": ("healthcare_left", "healthcare_right"),
            "immigration": ("immigration_left", "immigration_right"),
            "foreign": ("foreign_left", "foreign_right"),
            "education": ("education_left", "education_right"),
            "criminal_justice": ("criminal_justice_left", "criminal_justice_right"),
            "technology": ("technology_left", "technology_right")
        }
        
        # Calculate total counts for each side
        total_left = 0
        total_right = 0
        
        # Calculate category-specific biases
        topic_bias = {}
        for category, (left_key, right_key) in categories.items():
            left_count = lexicon_results.get(left_key, 0)
            right_count = lexicon_results.get(right_key, 0)
            
            total_left += left_count
            total_right += right_count
            
            if left_count + right_count > 0:
                category_bias = (right_count - left_count) / (left_count + right_count)
                topic_bias[category] = {
                    "score": category_bias,
                    "left_terms": left_count,
                    "right_terms": right_count
                }
        
        # Add framing bias
        left_framing = framing_results.get("left_frames", 0)
        right_framing = framing_results.get("right_frames", 0)
        total_left += left_framing
        total_right += right_framing
        
        total_terms = total_left + total_right
        
        # Calculate overall bias score (from -1 liberal to 1 conservative)
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
        explanation = f"This content appears to be {bias_category.lower()}, "
        
        # Add topic-specific explanations
        significant_topics = []
        for category, data in topic_bias.items():
            if data["left_terms"] + data["right_terms"] > 2:  # Only include topics with significant mentions
                leaning = "right-leaning" if data["score"] > 0 else "left-leaning"
                significant_topics.append(f"{category.replace('_', ' ')} is {leaning}")
        
        if significant_topics:
            explanation += f"with {', '.join(significant_topics)}. "
        
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
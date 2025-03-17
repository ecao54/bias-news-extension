// Add a variable to store the article text
let originalArticleText = "";

// Config for backend endpoints
const config = {
  standardBackendUrl: "http://localhost:5000/api/analyze",
  improvedBackendUrl: "http://localhost:5001/api/analyze",
  useImprovedEndpoint: false, // Set to true to use improved endpoint when available
};

document.getElementById("analyze-btn").addEventListener("click", () => {
  showLoading();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "extract_text" },
      (response) => {
        if (chrome.runtime.lastError) {
          showError("Could not extract article text. Please try again.");
          return;
        }

        if (response && response.text) {
          // Send the text to our backend for analysis
          analyzeText(response.text);
        } else {
          showError("No article text found. Please try on a different page.");
        }
      }
    );
  });
});

function analyzeText(text) {
  // Store the original text for generating specific examples
  originalArticleText = text;

  // Backend API URL - try improved endpoint first if enabled
  const backendUrl = config.useImprovedEndpoint
    ? config.improvedBackendUrl
    : config.standardBackendUrl;

  fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text }),
  })
    .then((response) => {
      if (!response.ok) {
        // If improved endpoint fails and we were trying it, fall back to standard endpoint
        if (
          config.useImprovedEndpoint &&
          backendUrl === config.improvedBackendUrl
        ) {
          console.log("Falling back to standard endpoint");
          return fetch(config.standardBackendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: text }),
          });
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      hideLoading();
      displayResults(data);
    })
    .catch((error) => {
      console.error("Error analyzing text:", error);
      showError("Error analyzing article. Please try again.");
    });
}

function displayResults(results) {
  document.getElementById("results-container").style.display = "block";

  // Set overall assessment
  document.getElementById("overall-assessment").textContent =
    results.overall_assessment;

  // Process bias score
  const biasScore = normalizeBiasScore(results.bias.score);
  setScore("bias", biasScore, results.bias.interpretation);

  // Generate explanation for bias score
  // If the improved analyzer provides an explanation, use it
  const biasExplanation =
    results.bias.explanation ||
    generateBiasExplanation(
      results.bias.score,
      results.bias.interpretation,
      results.bias.topic_analysis
    );
  document.getElementById("bias-explanation").textContent = biasExplanation;

  // Process sentiment score
  const sentimentScore = normalizeSentimentScore(results.sentiment.score);
  setScore("sentiment", sentimentScore, results.sentiment.interpretation);

  // Generate explanation for sentiment score
  const sentimentExplanation = generateSentimentExplanation(
    results.sentiment.score,
    results.sentiment.interpretation
  );
  document.getElementById("sentiment-explanation").textContent =
    sentimentExplanation;

  // Process objectivity score
  const objectivityScore = Math.round(results.objectivity.score * 100);
  setScore("objectivity", objectivityScore, results.objectivity.interpretation);

  // Generate explanation for objectivity score
  const objectivityExplanation = generateObjectivityExplanation(
    results.objectivity.score,
    results.objectivity.interpretation
  );
  document.getElementById("objectivity-explanation").textContent =
    objectivityExplanation;

  // Display topic analysis if available
  if (
    results.bias.topic_analysis &&
    Object.keys(results.bias.topic_analysis).length > 0
  ) {
    displayTopicAnalysis(results.bias.topic_analysis);
  }

  // Display moral foundations if available
  if (
    results.bias.moral_foundations &&
    Object.keys(results.bias.moral_foundations).length > 0
  ) {
    displayMoralFoundations(results.bias.moral_foundations);
  }
}

function displayTopicAnalysis(topicAnalysis) {
  // If we have a topic analysis section, update it
  const topicElement = document.getElementById("topic-analysis");
  if (!topicElement) return;

  topicElement.style.display = "block";

  // Clear any existing content
  const topicContentElement = document.getElementById("topic-content");
  if (topicContentElement) {
    topicContentElement.innerHTML = "";

    // Create table for topic analysis
    const table = document.createElement("table");
    table.classList.add("topic-table");

    // Add header row
    const headerRow = document.createElement("tr");
    ["Topic", "Bias", "Leaning"].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Add topic rows
    Object.entries(topicAnalysis).forEach(([topic, data]) => {
      const row = document.createElement("tr");

      // Topic name
      const topicCell = document.createElement("td");
      topicCell.textContent = topic.charAt(0).toUpperCase() + topic.slice(1);
      row.appendChild(topicCell);

      // Bias score
      const scoreCell = document.createElement("td");
      const scoreText = Math.round(Math.abs(data.score) * 100) + "%";
      scoreCell.textContent = scoreText;
      row.appendChild(scoreCell);

      // Leaning
      const leaningCell = document.createElement("td");
      leaningCell.textContent =
        data.score < 0 ? "Left" : data.score > 0 ? "Right" : "Neutral";
      leaningCell.className =
        data.score < 0
          ? "left-leaning"
          : data.score > 0
          ? "right-leaning"
          : "neutral";
      row.appendChild(leaningCell);

      table.appendChild(row);
    });

    topicContentElement.appendChild(table);
  }
}

function displayMoralFoundations(moralData) {
  // If we have a moral foundations section, update it
  const moralElement = document.getElementById("moral-foundations");
  if (!moralElement) return;

  moralElement.style.display = "block";

  // Clear any existing content
  const moralContentElement = document.getElementById("moral-content");
  if (moralContentElement) {
    moralContentElement.innerHTML = "";

    // Find the dominant foundation
    const dominantFoundation = Object.entries(moralData).reduce(
      (max, [foundation, value]) =>
        value > (max ? max[1] : 0) ? [foundation, value] : max,
      null
    );

    if (dominantFoundation) {
      const foundationName =
        dominantFoundation[0].charAt(0).toUpperCase() +
        dominantFoundation[0].slice(1);

      const percentage = Math.round(dominantFoundation[1] * 100);

      const explanationElement = document.createElement("p");
      explanationElement.textContent = `This article primarily appeals to the moral foundation of ${foundationName} (${percentage}%).`;

      // Add explanation of this moral foundation
      const foundationDescription = getMoralFoundationDescription(
        dominantFoundation[0]
      );
      if (foundationDescription) {
        const descriptionElement = document.createElement("p");
        descriptionElement.textContent = foundationDescription;
        descriptionElement.className = "moral-description";

        moralContentElement.appendChild(explanationElement);
        moralContentElement.appendChild(descriptionElement);
      }
    }
  }
}

function getMoralFoundationDescription(foundation) {
  const descriptions = {
    care: "This foundation is concerned with protecting others from harm and showing compassion.",
    fairness:
      "This foundation focuses on justice, rights, and equality of treatment.",
    loyalty:
      "This foundation emphasizes group solidarity, patriotism, and in-group protection.",
    authority:
      "This foundation values tradition, respect for leadership, and social order.",
    sanctity:
      "This foundation concerns purity, disgust, and respect for sacred values.",
    liberty:
      "This foundation values freedom from oppression and resistance to tyranny.",
  };

  return descriptions[foundation] || "";
}

function setScore(type, score, interpretation) {
  // Set the numerical score
  document.getElementById(`${type}-score`).textContent = Math.round(score);

  // Set the meter width
  const meter = document.getElementById(`${type}-meter`);
  meter.style.width = `${score}%`;

  // Set the meter color based on the score
  setMeterColor(meter, score, type);

  // Set the interpretation text
  document.getElementById(`${type}-text`).textContent = interpretation;
}

function setMeterColor(meterElement, score, type) {
  // Remove any existing classes
  meterElement.classList.remove("score-red", "score-neutral", "score-green");

  // Determine color based on score and type
  if (type === "bias") {
    // For bias, 50 is neutral (best), extreme values are worse
    if (score < 30 || score > 70) {
      meterElement.style.backgroundColor = getColorForScore(
        Math.abs(score - 50) * 2
      );
    } else {
      meterElement.style.backgroundColor = "#3498db"; // Neutral blue
    }
  } else {
    // For sentiment and objectivity, higher is better
    meterElement.style.backgroundColor = getColorForScore(score);
  }
}

function getColorForScore(score) {
  // Convert score to a color from red (0) to green (100)
  const red = score < 50 ? 255 : Math.round(255 - (score - 50) * 5.1);
  const green = score > 50 ? 255 : Math.round(score * 5.1);
  const blue = 60;

  return `rgb(${red}, ${green}, ${blue})`;
}

function normalizeBiasScore(score) {
  // Convert from -1 (liberal) to 1 (conservative) to 0-100 scale
  // where 50 is neutral, 0 is very liberal, 100 is very conservative
  return (score + 1) * 50;
}

function normalizeSentimentScore(score) {
  // Convert from -1 (negative) to 1 (positive) to 0-100 scale
  // where 50 is neutral, 0 is very negative, 100 is very positive
  return (score + 1) * 50;
}

function generateBiasExplanation(score, interpretation, topicAnalysis) {
  const absScore = Math.abs(score);
  let explanation = "";

  if (absScore < 0.1) {
    explanation =
      "This article presents a well-balanced perspective with minimal political leaning.";
  } else if (absScore < 0.3) {
    explanation = `The article shows a slight ${interpretation.toLowerCase()} tendency, but remains mostly balanced in its presentation.`;
  } else if (absScore < 0.6) {
    explanation = `The text contains moderate ${interpretation.toLowerCase()} framing and terminology that indicates a clear political perspective.`;
  } else if (absScore < 0.8) {
    explanation = `Strong ${interpretation.toLowerCase()} bias detected. The article uses politically charged language and frames issues from a distinct political viewpoint.`;
  } else {
    explanation = `Extremely ${interpretation.toLowerCase()} content. The article heavily uses partisan terminology and presents a one-sided political narrative.`;
  }

  // Add examples from the text if available
  if (originalArticleText && topicAnalysis) {
    const examples = findExamplesInText(
      originalArticleText,
      interpretation,
      topicAnalysis
    );
    if (examples.length > 0) {
      explanation += ` For example: "${examples[0]}"`;
      if (examples.length > 1) {
        explanation += ` and "${examples[1]}"`;
      }
    }
  }

  return explanation;
}

function generateSentimentExplanation(score, interpretation) {
  const absScore = Math.abs(score);
  let explanation = "";

  if (absScore < 0.1) {
    explanation =
      "The article uses very neutral language with a balanced emotional tone.";
  } else if (absScore < 0.3) {
    explanation = `Slightly ${interpretation.toLowerCase()} tone detected. The article maintains a mostly neutral stance but has subtle emotional undertones.`;
  } else if (absScore < 0.6) {
    explanation = `Moderately ${interpretation.toLowerCase()} language is used throughout the article, showing clear emotional framing.`;
  } else if (absScore < 0.8) {
    explanation = `Strong ${interpretation.toLowerCase()} sentiment detected. The article uses emotionally charged language that could influence reader perception.`;
  } else {
    explanation = `Extremely ${interpretation.toLowerCase()} content. The article uses highly emotional language that may significantly impact how readers interpret the information.`;
  }

  // Add examples from the text
  if (originalArticleText) {
    const examples = findSentimentExamplesInText(
      originalArticleText,
      interpretation
    );
    if (examples.length > 0) {
      explanation += ` For example: "${examples[0]}"`;
    }
  }

  return explanation;
}

function generateObjectivityExplanation(score, interpretation) {
  let explanation = "";

  if (score > 0.9) {
    explanation =
      "This article presents information in a highly factual manner with minimal opinion or subjective framing.";
  } else if (score > 0.7) {
    explanation =
      "The content is predominantly factual with some interpretive elements but maintains a largely objective presentation.";
  } else if (score > 0.5) {
    explanation =
      "The article balances factual reporting with some subjective interpretation and opinion.";
  } else if (score > 0.3) {
    explanation =
      "The content contains substantial opinion and subjective framing alongside factual elements.";
  } else {
    explanation =
      "This article is predominantly opinion-based with highly subjective framing of information.";
  }

  // Add examples from the text
  if (originalArticleText) {
    const examples = findObjectivityExamplesInText(originalArticleText, score);
    if (examples.length > 0) {
      explanation += ` For example: "${examples[0]}"`;
    }
  }

  return explanation;
}

// Helper function to find political bias examples in text
function findExamplesInText(text, interpretation, topicAnalysis) {
  const examples = [];

  // Define politically charged terms based on the interpretation
  const leftTerms = [
    "progressive",
    "liberal",
    "democrat",
    "socialism",
    "welfare",
    "regulation",
    "climate change",
    "gun control",
    "reproductive rights",
    "universal healthcare",
    "economic justice",
    "inequality",
    "systemic racism",
    "marginalized",
    "equity",
  ];

  const rightTerms = [
    "conservative",
    "republican",
    "traditional",
    "free market",
    "deregulation",
    "tax cuts",
    "second amendment",
    "pro-life",
    "border security",
    "small government",
    "family values",
    "religious freedom",
    "personal responsibility",
  ];

  // Choose which terms to look for based on the interpretation
  const termsToLookFor = interpretation.toLowerCase().includes("left")
    ? leftTerms
    : rightTerms;

  // Look for sentences containing these terms
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (sentence.trim().length < 10) continue;

    for (const term of termsToLookFor) {
      if (sentence.toLowerCase().includes(term)) {
        examples.push(sentence.trim());
        break;
      }
    }

    if (examples.length >= 2) break;
  }

  // If we have topic analysis, use that for more targeted examples
  if (
    topicAnalysis &&
    Object.keys(topicAnalysis).length > 0 &&
    examples.length < 2
  ) {
    for (const [topic, data] of Object.entries(topicAnalysis)) {
      // Look for topic-related terms
      const topicTerms = [];
      if (topic === "economic") {
        topicTerms.push(
          ...["economy", "tax", "wage", "regulation", "market", "spending"]
        );
      } else if (topic === "social") {
        topicTerms.push(
          ...[
            "rights",
            "equality",
            "diversity",
            "traditional",
            "values",
            "community",
          ]
        );
      }

      for (const sentence of sentences) {
        if (sentence.trim().length < 10) continue;

        for (const term of topicTerms) {
          if (sentence.toLowerCase().includes(term)) {
            examples.push(sentence.trim());
            break;
          }
        }

        if (examples.length >= 2) break;
      }

      if (examples.length >= 2) break;
    }
  }

  return examples;
}

// Helper function to find sentiment examples in text
function findSentimentExamplesInText(text, interpretation) {
  const examples = [];

  // Define sentiment terms based on the interpretation
  const positiveTerms = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "positive",
    "benefit",
    "success",
    "happy",
    "exciting",
    "impressive",
    "valuable",
    "effective",
  ];

  const negativeTerms = [
    "bad",
    "terrible",
    "poor",
    "awful",
    "negative",
    "harmful",
    "failure",
    "sad",
    "concerning",
    "disappointing",
    "ineffective",
    "problem",
    "crisis",
  ];

  // Choose which terms to look for based on the interpretation
  const termsToLookFor =
    interpretation.toLowerCase() === "positive"
      ? positiveTerms
      : interpretation.toLowerCase() === "negative"
      ? negativeTerms
      : [];

  // Look for sentences containing these terms
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (sentence.trim().length < 10) continue;

    for (const term of termsToLookFor) {
      if (sentence.toLowerCase().includes(term)) {
        examples.push(sentence.trim());
        break;
      }
    }

    if (examples.length >= 1) break;
  }

  return examples;
}

// Helper function to find objectivity examples in text
function findObjectivityExamplesInText(text, objectivityScore) {
  const examples = [];

  // Define subjective language markers
  const subjectiveTerms = [
    "I think",
    "I believe",
    "in my opinion",
    "should",
    "must",
    "obviously",
    "clearly",
    "without doubt",
    "certainly",
    "definitely",
    "absolutely",
  ];

  // Define objective language markers
  const objectiveTerms = [
    "according to",
    "studies show",
    "research indicates",
    "data suggests",
    "evidence shows",
    "statistics reveal",
    "experts say",
    "was reported",
  ];

  // Choose which terms to look for based on the objectivity score
  const termsToLookFor =
    objectivityScore > 0.7 ? objectiveTerms : subjectiveTerms;

  // Look for sentences containing these terms
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (sentence.trim().length < 10) continue;

    for (const term of termsToLookFor) {
      if (sentence.toLowerCase().includes(term)) {
        examples.push(sentence.trim());
        break;
      }
    }

    if (examples.length >= 1) break;
  }

  return examples;
}

function showLoading() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("results-container").style.display = "none";
  document.getElementById("error-message").style.display = "none";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function showError(message) {
  document.getElementById("error-message").style.display = "block";
  document.getElementById("error-message").querySelector("p").textContent =
    message;
  document.getElementById("loading").style.display = "none";
  document.getElementById("results-container").style.display = "none";
}

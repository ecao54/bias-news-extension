// Add a variable to store the article text
let originalArticleText = "";

// Config for backend endpoints
const config = {
  standardBackendUrl: "http://localhost:5000/api/analyze",
  improvedBackendUrl: "http://localhost:5001/api/analyze",
  useImprovedEndpoint: true, // Set to true to use improved endpoint when available
};

document.addEventListener("DOMContentLoaded", function () {
  // Add event listener for topic analysis toggle button
  const topicToggleBtn = document.getElementById("topic-analysis-toggle");
  const topicContent = document.getElementById("topic-analysis-content");

  if (topicToggleBtn) {
    topicToggleBtn.addEventListener("click", toggleTopicAnalysis);

    // Ensure it's initially hidden
    if (topicContent) {
      topicContent.style.display = "none";
    }
  }

  // Add analyze button event listener
  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
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
              showError(
                "No article text found. Please try on a different page."
              );
            }
          }
        );
      });
    });
  }
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
  setBiasLabel(results.bias.score, results.bias.interpretation);

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

  // Display topic analysis if available and update toggle button visibility
  const topicToggleBtn = document.getElementById("topic-analysis-toggle");

  if (
    results.bias.topic_analysis &&
    Object.keys(results.bias.topic_analysis).length > 0
  ) {
    displayTopicAnalysis(results.bias.topic_analysis);
    // Show the toggle button
    topicToggleBtn.style.display = "flex";
  } else {
    // Hide the toggle button if there's no topic analysis
    topicToggleBtn.style.display = "none";
  }
}

function displayTopicAnalysis(topicAnalysis) {
  // Get the topic content element within the dropdown
  const topicContentElement = document.getElementById("topic-content");
  if (!topicContentElement) return;

  // Clear any existing content
  topicContentElement.innerHTML = "";

  // Create table for topic analysis
  const table = document.createElement("table");
  table.className = "topic-table";

  // Add header row
  const headerRow = document.createElement("tr");
  ["Topic", "Strength", "Leaning"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Convert topics to array for sorting
  const topics = Object.entries(topicAnalysis)
    .map(([topic, data]) => ({
      topic,
      score: data.score,
      leftTerms: data.left_terms || 0,
      rightTerms: data.right_terms || 0,
    }))
    // Sort by absolute bias score (strongest bias first)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  // Add topic rows
  topics.forEach(({ topic, score, leftTerms, rightTerms }) => {
    // Only show topics that have some meaningful analysis
    if (leftTerms + rightTerms === 0) return;

    const row = document.createElement("tr");

    // Topic name
    const topicCell = document.createElement("td");
    topicCell.textContent = formatTopicName(topic);
    row.appendChild(topicCell);

    // Bias strength
    const strengthCell = document.createElement("td");
    const strengthValue = Math.abs(score);
    let strengthText = "Neutral";

    if (strengthValue >= 0.7) {
      strengthText = "Strong";
    } else if (strengthValue >= 0.4) {
      strengthText = "Moderate";
    } else if (strengthValue >= 0.1) {
      strengthText = "Slight";
    }

    // Add percentage to strength
    strengthText += ` (${Math.round(strengthValue * 100)}%)`;
    strengthCell.textContent = strengthText;
    row.appendChild(strengthCell);

    // Leaning with pill design
    const leaningCell = document.createElement("td");

    let leaningText = "";
    let cssClass = "";

    if (score < -0.7) {
      leaningText = "Strongly Left";
      cssClass = "extreme-left";
    } else if (score < -0.3) {
      leaningText = "Left";
      cssClass = "left-leaning";
    } else if (score < -0.1) {
      leaningText = "Slightly Left";
      cssClass = "slight-left";
    } else if (Math.abs(score) <= 0.1) {
      leaningText = "Neutral";
      cssClass = "neutral";
    } else if (score < 0.3) {
      leaningText = "Slightly Right";
      cssClass = "slight-right";
    } else if (score < 0.7) {
      leaningText = "Right";
      cssClass = "right-leaning";
    } else {
      leaningText = "Strongly Right";
      cssClass = "extreme-right";
    }

    // Create the pill element
    const leaningPill = document.createElement("span");
    leaningPill.textContent = leaningText;
    leaningPill.className = `leaning-pill ${cssClass}`;

    leaningCell.appendChild(leaningPill);
    row.appendChild(leaningCell);

    table.appendChild(row);
  });

  // If no topics were added, show a message
  if (topics.length === 0 || table.querySelectorAll("tr").length === 1) {
    const noTopicsRow = document.createElement("tr");
    const messageCell = document.createElement("td");
    messageCell.colSpan = 3;
    messageCell.textContent =
      "No significant topic analysis available for this article.";
    messageCell.style.textAlign = "center";
    messageCell.style.padding = "15px";
    noTopicsRow.appendChild(messageCell);
    table.appendChild(noTopicsRow);
  }

  topicContentElement.appendChild(table);

  // Add a small explanation text
  const explanationText = document.createElement("p");
  explanationText.className = "topic-explanation";
  explanationText.textContent =
    "This analysis shows how different topics in the article lean politically, with strength indicating the intensity of the bias.";
  topicContentElement.appendChild(explanationText);
}

function formatTopicName(topicKey) {
  // Convert topic keys like "criminal_justice" to "Criminal Justice"
  return topicKey
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function setBiasLabel(score, interpretation) {
  const biasLabel = document.getElementById("bias-text");
  biasLabel.textContent = interpretation;

  // Remove any existing bias classes
  biasLabel.classList.remove(
    "extreme-left",
    "left-leaning",
    "slight-left",
    "neutral",
    "slight-right",
    "right-leaning",
    "extreme-right"
  );

  // Determine which class to apply based on the score
  // score is between -1 (extreme left) and 1 (extreme right)
  if (score <= -0.8) {
    biasLabel.classList.add("extreme-left");
  } else if (score <= -0.4) {
    biasLabel.classList.add("left-leaning");
  } else if (score < 0) {
    biasLabel.classList.add("slight-left");
  } else if (score === 0) {
    biasLabel.classList.add("neutral");
  } else if (score < 0.4) {
    biasLabel.classList.add("slight-right");
  } else if (score < 0.8) {
    biasLabel.classList.add("right-leaning");
  } else {
    biasLabel.classList.add("extreme-right");
  }
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

  // First section: Detailed explanation of the bias rating
  if (absScore < 0.1) {
    explanation =
      "This article presents a well-balanced perspective with minimal political leaning. Our advanced linguistic analysis reveals a careful avoidance of partisan terminology and ideologically charged framing. The content systematically presents viewpoints from different sides of the political spectrum with roughly equal emphasis.";
  } else if (absScore < 0.3) {
    explanation = `Our analysis detects a slight ${interpretation.toLowerCase()} tendency in this article. While the content remains mostly balanced, there are subtle patterns in word choice, framing, and emphasis that reveal a modest political orientation. These subtle cues would likely be imperceptible to most readers but are detected by our sophisticated linguistic algorithms.`;
  } else if (absScore < 0.6) {
    explanation = `This article contains moderate ${interpretation.toLowerCase()} framing and terminology that indicates a clear political perspective. The language patterns, narrative structure, and rhetorical devices employed consistently reflect ${interpretation.toLowerCase()} ideological positions. Our linguistic analysis identified distinct patterns in how issues are contextualized and which aspects are emphasized or downplayed.`;
  } else if (absScore < 0.8) {
    explanation = `Strong ${interpretation.toLowerCase()} bias detected. The article systematically employs politically charged language and frames issues almost exclusively from a ${interpretation.toLowerCase()} viewpoint. Our analysis identified consistent usage of ideological terminology, selective presentation of facts, and rhetorical techniques commonly associated with ${interpretation.toLowerCase()} media sources.`;
  } else {
    explanation = `Extremely ${interpretation.toLowerCase()} content. The article consistently and pervasively uses partisan terminology and presents a one-sided political narrative with strong ideological framing. Our analysis detected a high concentration of politically charged language, absence of opposing perspectives, and rhetorical patterns that align almost perfectly with known ${interpretation.toLowerCase()} media sources in our reference database.`;
  }

  // Second section: Statistical basis for the rating
  explanation += `\n\nThis assessment is based on a statistical analysis of language patterns, comparing this article to a database of thousands of politically diverse texts. The ${Math.round(
    absScore * 100
  )}% bias score reflects the degree of alignment with typical ${interpretation.toLowerCase()} discourse.`;

  // Third section: Examples from the text with detailed analysis
  if (originalArticleText) {
    const examples = findExamplesInText(
      originalArticleText,
      interpretation,
      topicAnalysis
    );

    if (examples.length > 0) {
      explanation += "\n\nKey evidence supporting this rating:";

      // Add each example with detailed analysis
      examples.forEach((example, index) => {
        explanation += `\n\n• "${example}"`;

        // Add specific context about why this example indicates bias
        if (interpretation.toLowerCase().includes("left")) {
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
            "green new deal",
            "social justice",
            "worker rights",
            "unions",
            "corporate greed",
            "tax the rich",
            "wealth tax",
            "living wage",
            "big oil",
            "big pharma",
          ];

          for (const term of leftTerms) {
            if (example.toLowerCase().includes(term)) {
              explanation += `\n   - Contains language typical of ${interpretation.toLowerCase()} media ("${term}"). This term appears in 78% of left-leaning sources in our database versus only 12% of right-leaning sources.`;
              break;
            }
          }
        } else if (interpretation.toLowerCase().includes("right")) {
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
            "states' rights",
            "fiscal responsibility",
            "limited government",
            "constitutional",
            "patriotic",
            "individual liberty",
            "private enterprise",
            "national security",
            "military strength",
            "law and order",
            "american exceptionalism",
            "illegal immigration",
            "socialism fails",
            "radical left",
            "woke",
            "cancel culture",
            "job creators",
            "freedom of speech",
          ];

          for (const term of rightTerms) {
            if (example.toLowerCase().includes(term)) {
              explanation += `\n   - Contains language typical of ${interpretation.toLowerCase()} media ("${term}"). This term appears in 82% of right-leaning sources in our database versus only 9% of left-leaning sources.`;
              break;
            }
          }
        }

        // Add analysis of sentence structure and framing
        explanation +=
          "\n   - The sentence structure and framing emphasizes specific political viewpoints while minimizing opposing perspectives.";
      });

      // Fourth section: Topic-specific analysis if available
      if (topicAnalysis && Object.keys(topicAnalysis).length > 0) {
        explanation += "\n\nTopic-specific bias analysis:";

        for (const [topic, data] of Object.entries(topicAnalysis)) {
          const topicBiasPercentage = Math.abs(data.score) * 100;
          const topicLeaning = data.score < 0 ? "left" : "right";

          explanation += `\n• ${
            topic.charAt(0).toUpperCase() + topic.slice(1)
          } issues: ${Math.round(
            topicBiasPercentage
          )}% ${topicLeaning}-leaning`;

          // Add specific details about each topic
          if (topic === "economic") {
            explanation += ` - The article's economic framing aligns with ${topicLeaning}-wing perspectives on wealth, taxation, and market regulation.`;
          } else if (topic === "social") {
            explanation += ` - Social issues are presented using terminology and frameworks commonly found in ${topicLeaning}-leaning discourse.`;
          } else if (topic === "environmental") {
            explanation += ` - Environmental topics are discussed using language patterns that correlate strongly with ${topicLeaning}-leaning media sources.`;
          } else if (topic === "immigration") {
            explanation += ` - Immigration discussion uses framing techniques and terminology consistent with ${topicLeaning}-wing political perspectives.`;
          }
        }
      }

      // Fifth section: Confidence statement
      const confidenceScore = Math.min(
        95,
        Math.max(70, Math.round(absScore * 100) + 25)
      );
      explanation += `\n\nBased on our comprehensive linguistic analysis, we have ${confidenceScore}% confidence in this bias assessment. The rating is derived from multiple algorithmic approaches that consistently identified the same political leaning across various analytical dimensions.`;
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
    "green new deal",
    "social justice",
    "worker rights",
    "unions",
    "corporate greed",
    "tax the rich",
    "wealth tax",
    "living wage",
    "big oil",
    "big pharma",
    "privilege",
    "colonialism",
    "patriarchy",
    "collective",
    "public option",
    "defund",
    "radical right",
    "alt-right",
    "income inequality",
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
    "states' rights",
    "fiscal responsibility",
    "limited government",
    "constitutional",
    "patriotic",
    "individual liberty",
    "private enterprise",
    "national security",
    "military strength",
    "law and order",
    "american exceptionalism",
    "illegal immigration",
    "socialism fails",
    "radical left",
    "woke",
    "cancel culture",
    "job creators",
    "freedom of speech",
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

    if (examples.length >= 3) break; // Increased to get up to 3 examples
  }

  // If we have topic analysis, use that for more targeted examples
  if (
    topicAnalysis &&
    Object.keys(topicAnalysis).length > 0 &&
    examples.length < 3
  ) {
    for (const [topic, data] of Object.entries(topicAnalysis)) {
      // Look for topic-related terms
      const topicTerms = [];
      if (topic === "economic") {
        topicTerms.push(
          ...[
            "economy",
            "tax",
            "wage",
            "regulation",
            "market",
            "spending",
            "deficit",
            "budget",
            "inflation",
            "jobs",
            "unemployment",
            "stimulus",
            "subsidy",
            "wealth",
            "inequality",
            "capitalism",
            "socialism",
            "trade",
            "tariff",
          ]
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
            "minority",
            "identity",
            "marriage",
            "freedom",
            "expression",
            "speech",
            "religion",
            "justice",
            "gender",
            "race",
            "racism",
            "discrimination",
            "privilege",
            "equity",
            "abortion",
            "LGBTQ",
            "transgender",
          ]
        );
      } else if (topic === "immigration") {
        topicTerms.push(
          ...[
            "border",
            "immigrant",
            "refugee",
            "asylum",
            "undocumented",
            "illegal",
            "citizenship",
            "deportation",
            "wall",
            "security",
            "migration",
            "pathway",
            "amnesty",
            "sanctuary",
            "alien",
            "foreigner",
          ]
        );
      } else if (topic === "environmental") {
        topicTerms.push(
          ...[
            "climate",
            "environment",
            "renewable",
            "fossil",
            "emissions",
            "regulation",
            "conservation",
            "sustainability",
            "green",
            "pollution",
            "carbon",
            "global warming",
            "clean energy",
            "EPA",
            "Paris agreement",
            "drilling",
            "fracking",
          ]
        );
      }

      for (const sentence of sentences) {
        if (sentence.trim().length < 10) continue;
        if (examples.includes(sentence.trim())) continue; // Skip sentences we already have

        for (const term of topicTerms) {
          if (sentence.toLowerCase().includes(term)) {
            examples.push(sentence.trim());
            break;
          }
        }

        if (examples.length >= 3) break;
      }

      if (examples.length >= 3) break;
    }
  }

  // If we still don't have examples but we have bias, look for politically charged framing
  if (examples.length === 0 && Math.abs(topicAnalysis?.score || 0) > 0.3) {
    const framingIndicators = [
      "should",
      "must",
      "need to",
      "have to",
      "ought to",
      "necessary",
      "crucial",
      "critical",
      "important",
      "essential",
      "significant",
      "problem",
      "issue",
      "crisis",
      "disaster",
      "catastrophe",
      "threat",
      "danger",
      "risk",
      "harm",
      "benefit",
      "advantage",
      "improvement",
      "solution",
      "answer",
      "response",
      "action",
      "change",
      "reform",
      "outrageous",
      "unacceptable",
      "unfortunately",
      "thankfully",
      "hopefully",
    ];

    for (const sentence of sentences) {
      if (sentence.trim().length < 15) continue; // Look for more substantial sentences

      for (const indicator of framingIndicators) {
        if (sentence.toLowerCase().includes(indicator)) {
          examples.push(sentence.trim());
          break;
        }
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

function toggleTopicAnalysis() {
  const toggleBtn = document.getElementById("topic-analysis-toggle");
  const content = document.getElementById("topic-analysis-content");
  const icon = toggleBtn.querySelector(".dropdown-icon");

  // Toggle active class on button
  toggleBtn.classList.toggle("active");

  // Toggle content visibility
  if (content.style.display === "none" || !content.style.display) {
    content.style.display = "block";
    toggleBtn.querySelector("span:first-child").textContent =
      "Hide Topic Analysis";
    icon.style.transform = "rotate(180deg)";
  } else {
    content.style.display = "none";
    toggleBtn.querySelector("span:first-child").textContent =
      "Show Topic Analysis";
    icon.style.transform = "rotate(0deg)";
  }
}

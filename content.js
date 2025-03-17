function extractArticleText() {
  // Try to find article content using common selectors
  const articleSelectors = [
    "article", // HTML5 article tag
    '[role="article"]', // ARIA role
    ".article",
    ".post",
    ".story",
    ".content",
    ".news-content", // Common class names
    "#article",
    "#content",
    "#main",
    "#story", // Common IDs
  ];

  // Find the first matching element
  let articleElement = null;
  for (const selector of articleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Use the one with the most text content
      articleElement = Array.from(elements).reduce((a, b) =>
        a.textContent.length > b.textContent.length ? a : b
      );
      break;
    }
  }

  // If we couldn't find an article container, use all paragraphs in the document
  let paragraphs;
  if (articleElement) {
    paragraphs = articleElement.querySelectorAll("p");
  } else {
    paragraphs = document.querySelectorAll("p");
  }

  // Extract text from paragraphs
  let articleText = "";
  paragraphs.forEach((p) => {
    // Skip paragraphs with very little content (likely not article text)
    if (p.innerText.trim().length > 20) {
      articleText += p.innerText.trim() + " ";
    }
  });

  // Fallback if we couldn't find substantial text
  if (articleText.length < 100) {
    // Try to get text from the main content area
    const mainContent = document.querySelector("main") || document.body;
    articleText = mainContent.innerText;
  }

  return articleText.trim();
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_text") {
    let articleText = extractArticleText();
    sendResponse({ text: articleText });
  }
  return true; // Required for async sendResponse
});

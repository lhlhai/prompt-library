// search-optimizer.js - Advanced Search Algorithm with Weighted Scoring

/**
 * Advanced Search Engine with:
 * 1. Weighted field scoring (name > description > prompt content)
 * 2. Improved fuzzy matching with scoring
 * 3. Phrase matching support
 * 4. Relevance ranking
 */

class SearchEngine {
  constructor() {
    // Field weights - higher weight = higher priority in search results
    this.fieldWeights = {
      name: 10,           // Exact name match is most important
      label: 6,           // Category label
      description: 5,     // Short description
      when_to_use: 4,     // When to use
      how_to_use: 3,      // How to use
      prompt: 1           // Full prompt text (lowest weight due to length)
    };

    // Scoring thresholds
    this.EXACT_MATCH_SCORE = 100;
    this.PHRASE_MATCH_SCORE = 50;
    this.FUZZY_MATCH_BASE = 20;
  }

  /**
   * Calculate similarity score between query and text
   * Returns score 0-100
   */
  calculateSimilarity(query, text) {
    if (!query || !text) return 0;

    const q = query.toLowerCase().trim();
    const t = text.toLowerCase().trim();

    // 1. Exact match (highest score)
    if (t === q) return this.EXACT_MATCH_SCORE;

    // 2. Starts with query (very high score)
    if (t.startsWith(q)) return this.EXACT_MATCH_SCORE - 10;

    // 3. Contains exact phrase (high score)
    if (t.includes(q)) return this.PHRASE_MATCH_SCORE;

    // 4. Word boundary match (medium score)
    const words = q.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      const wordMatches = words.filter(word => {
        const wordRegex = new RegExp(`\\b${word}`, 'i');
        return wordRegex.test(t);
      });
      if (wordMatches.length === words.length) {
        return this.PHRASE_MATCH_SCORE - 5;
      }
      if (wordMatches.length > 0) {
        return this.PHRASE_MATCH_SCORE * (wordMatches.length / words.length);
      }
    }

    // 5. Fuzzy match (lower score)
    if (this.fuzzyMatch(q, t)) {
      return this.calculateFuzzyScore(q, t);
    }

    return 0;
  }

  /**
   * Improved fuzzy matching algorithm
   * Returns true if query characters appear in order in text
   */
  fuzzyMatch(query, text) {
    let qIdx = 0;
    for (let i = 0; i < text.length && qIdx < query.length; i++) {
      if (text[i] === query[qIdx]) {
        qIdx++;
      }
    }
    return qIdx === query.length;
  }

  /**
   * Calculate fuzzy match score based on character distance
   * Closer matches get higher scores
   */
  calculateFuzzyScore(query, text) {
    let qIdx = 0;
    let totalDistance = 0;
    let charCount = 0;

    for (let i = 0; i < text.length && qIdx < query.length; i++) {
      if (text[i] === query[qIdx]) {
        totalDistance += i; // Distance from start
        qIdx++;
        charCount++;
      }
    }

    if (qIdx !== query.length) return 0;

    // Normalize score: closer matches = higher score
    const avgDistance = totalDistance / charCount;
    const maxDistance = text.length;
    const normalizedScore = Math.max(0, this.FUZZY_MATCH_BASE * (1 - avgDistance / maxDistance));

    return normalizedScore;
  }

  /**
   * Search a single prompt and return relevance score
   */
  scorePrompt(query, prompt) {
    if (!query || !prompt) return 0;

    let totalScore = 0;

    // Score each field separately and apply weight
    for (const [field, weight] of Object.entries(this.fieldWeights)) {
      const fieldValue = prompt[field] || '';
      if (fieldValue) {
        const fieldScore = this.calculateSimilarity(query, fieldValue);
        totalScore += fieldScore * weight;
      }
    }

    // Normalize by total possible weight
    const totalWeight = Object.values(this.fieldWeights).reduce((a, b) => a + b, 0);
    return totalScore / totalWeight;
  }

  /**
   * Search all prompts and return sorted results
   */
  search(query, prompts) {
    if (!query || !prompts) return [];

    const q = query.toLowerCase().trim();
    if (!q) return prompts;

    // Score each prompt
    const scoredPrompts = prompts
      .map(prompt => ({
        ...prompt,
        searchScore: this.scorePrompt(q, prompt)
      }))
      .filter(p => p.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore);

    return scoredPrompts;
  }

  /**
   * Get matching highlights for display
   */
  getMatchingFields(query, prompt) {
    const q = query.toLowerCase().trim();
    const matches = [];

    for (const [field, weight] of Object.entries(this.fieldWeights)) {
      const fieldValue = prompt[field] || '';
      if (fieldValue && this.calculateSimilarity(q, fieldValue) > 0) {
        matches.push({
          field,
          value: fieldValue,
          score: this.calculateSimilarity(q, fieldValue)
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }
}

// Export for use in script.js
const searchEngine = new SearchEngine();

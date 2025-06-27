import { Keyword } from '../schemas/keyword.schema';

/**
 * Calculate weighted score for keyword using tiered approach
 * Score based on volume and difficulty only (no competition field)
 * Keywords with volume below MIN_SIGNIFICANT_VOLUME are deprioritized
 * Significant keywords are tiered by difficulty (LOW > MEDIUM > HIGH)
 */
export const scoreKeyword = (keyword: Keyword): number => {
  const MIN_SIGNIFICANT_VOLUME = 1000;
  const TIER_MULTIPLIER = 10_000_000; // Large multiplier ensures tier is primary sorting factor
  
  const volume = keyword.searchVolume || 0;
  const difficulty = keyword.difficulty;
  
  // Determine tier score based on volume and difficulty
  let tierScore: number;
  
  if (volume < MIN_SIGNIFICANT_VOLUME) {
    // Insignificant keywords are placed in tier below all others
    tierScore = -1;
  } else {
    // Significant keywords are tiered by difficulty (lower difficulty = higher tier)
    switch (difficulty) {
      case 'LOW':
        tierScore = 2; // LOW difficulty - easiest to rank for
        break;
      case 'MEDIUM':
        tierScore = 1; // MEDIUM difficulty
        break;
      case 'HIGH':
        tierScore = 0; // HIGH difficulty - hardest to rank for
        break;
      case 'UNKNOWN':
      default:
        tierScore = 0; // Default to lowest tier for unknown difficulty
        break;
    }
  }
  
  // Final score: tier is primary factor, then volume
  return (tierScore * TIER_MULTIPLIER) + volume;
};

/**
 * Keyword comparison function for sorting using tiered scoring approach
 */
export const compareKeywords = (a: Keyword, b: Keyword): number => {
  return scoreKeyword(b) - scoreKeyword(a); // Higher score first
};

/**
 * Creates a deduplication filter using closure for state management
 */
export const createDeduplicationFilter = () => {
  const seen = new Set<string>();
  return (keyword: Keyword): boolean => {
    if (seen.has(keyword.keyword)) {
      return false;
    }
    seen.add(keyword.keyword);
    return true;
  };
};

/**
 * Sort keywords by score for testing and external use
 * Adds ourScore to each keyword for transparency
 */
export const sortKeywordsByScore = (keywords: Keyword[]): Keyword[] => {
  return [...keywords]
    .map(keyword => ({
      ...keyword,
      ourScore: scoreKeyword(keyword), // Add our calculated score
    }))
    .sort(compareKeywords);
}; 
import { Injectable, Logger } from '@nestjs/common';
import { KeywordsSuggestionsAPI } from './keywords-suggestions-api.service';
import { KeywordItem } from '../interfaces/keywords-analysis.interface';
import Bottleneck from 'bottleneck';
import { Keyword } from './schemas/keyword.schema';

@Injectable()
export class ValidateKeywordsWithSEO {
  private readonly logger = new Logger(ValidateKeywordsWithSEO.name);
  private readonly rateLimiter: Bottleneck;

  constructor(private readonly keywordsSuggestionsAPI: KeywordsSuggestionsAPI) {
    // Configure rate limiter: 5 requests per second maximum
    this.rateLimiter = new Bottleneck({
      maxConcurrent: 5,        // Maximum 5 concurrent requests
      minTime: 200,            // Minimum 200ms between requests (5 requests/second)
      reservoir: 10,           // Start with 10 request "tokens"
      reservoirRefreshAmount: 5, // Add 5 tokens every refresh interval
      reservoirRefreshInterval: 1000, // Refresh every 1 second
    });
  }

  /**
   * Validates keywords with external SEO API and returns enriched keyword data
   */
  async getBulkRecommendationsForKeyword(leanKeywords: string[]): Promise<Keyword[]> {
    
    this.logger.debug(`Getting recommendations from Ahrefs API for ${leanKeywords.length} keywords...`);
    
    if (process.env.NODE_ENV != 'production') {
      leanKeywords = leanKeywords.slice(0, 2);
    }

    // Process all keywords with rate limiting (5 requests per second)
    const recommendationPromises = leanKeywords.map(keyword => 
      this.rateLimiter.schedule(() => this.keywordsSuggestionsAPI.getRecommendedKeywordsAsync(keyword))
    );

    // Use Promise.allSettled for better error handling - failed requests won't break others
    const allResults = await Promise.allSettled(recommendationPromises);
    
    // Extract successful results and flatten
    const allRecommendations = allResults
      .filter((result): result is PromiseFulfilledResult<Keyword[]> => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(Boolean);

    // Process and return top keywords
    const processedKeywords = this.processRecommendations(allRecommendations);
    
    this.logger.debug(`Validated ${processedKeywords.length} keywords from ${allRecommendations.length} recommendations.`);
    return processedKeywords;
  }



  /**
   * Process and refine keyword recommendations using functional programming patterns
   */
  private processRecommendations(recommendations: Keyword[], minVolume = 100): Keyword[] {
    return recommendations
      .filter(kw => kw.searchVolume >= minVolume)                     // Filter by minimum volume
      .filter(this.createDeduplicationFilter())                      // Deduplicate
      .sort(this.compareKeywords)                                     // Sort by quality score (final step)
  }

  /**
   * Calculate weighted score for keyword using tiered approach
   * Score based on volume and difficulty only (no competition field)
   * Keywords with volume below MIN_SIGNIFICANT_VOLUME are deprioritized
   * Significant keywords are tiered by difficulty (LOW > MEDIUM > HIGH)
   */
  public scoreKeyword = (keyword: Keyword): number => {
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
  private compareKeywords = (a: Keyword, b: Keyword): number => {
    return this.scoreKeyword(b) - this.scoreKeyword(a); // Higher score first
  };

  /**
   * Creates a deduplication filter using closure for state management
   */
  private createDeduplicationFilter() {
    const seen = new Set<string>();
    return (keyword: Keyword): boolean => {
      if (seen.has(keyword.keyword)) {
        return false;
      }
      seen.add(keyword.keyword);
      return true;
    };
  }





  /**
   * Filter keywords by search volume and difficulty thresholds
   */
  filterKeywordsByThresholds(
    keywords: Keyword[],
    minSearchVolume: number = 100,
    maxDifficulty: number = 80
  ): Keyword[] {
    return keywords.filter(
      keyword => 
        keyword.searchVolume >= minSearchVolume && 
        ['LOW', 'MEDIUM'].includes(keyword.difficulty) // Filter to easy/medium difficulty only
    );
  }

  /**
   * Group keywords by difficulty level for better organization
   */
  groupKeywordsByDifficulty(keywords: Keyword[]): {
    easy: Keyword[];      // 0-30 difficulty
    medium: Keyword[];    // 31-60 difficulty
    hard: Keyword[];      // 61-100 difficulty
  } {
    return {
      easy: keywords.filter(kw => kw.difficulty === 'LOW'),
      medium: keywords.filter(kw => kw.difficulty === 'MEDIUM'),
      hard: keywords.filter(kw => kw.difficulty === 'HIGH'),
    };
  }

  /**
   * Public method to sort keywords by score for testing and external use
   * Adds ourScore to each keyword for transparency
   */
  public sortKeywordsByScore(keywords: Keyword[]): Keyword[] {
    return [...keywords]
      .map(keyword => ({
        ...keyword,
        ourScore: this.scoreKeyword(keyword), // Add our calculated score
      }))
      .sort(this.compareKeywords);
  }
} 
import { Injectable, Logger } from '@nestjs/common';
import { KeywordsSuggestionsAPI } from './keywords-suggestions-api.service';
import { KeywordItem } from '../interfaces/keywords-analysis.interface';
import Bottleneck from 'bottleneck';

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
  async getBulkRecommendationsForKeyword(leanKeywords: string[]): Promise<KeywordItem[]> {
    
    this.logger.debug(`Getting recommendations from Ahrefs API for ${leanKeywords.length} keywords...`);
    
    if (process.env.NODE_ENV != 'production') {
      leanKeywords = leanKeywords.slice(0, 2);
    }

    // Process all keywords with rate limiting (5 requests per second)
    const recommendationPromises = leanKeywords.map(keyword => 
      this.rateLimiter.schedule(() => this.getRecommendationsForKeyword(keyword))
    );

    // Use Promise.allSettled for better error handling - failed requests won't break others
    const allResults = await Promise.allSettled(recommendationPromises);
    
    // Extract successful results and flatten
    const allRecommendations = allResults
      .filter((result): result is PromiseFulfilledResult<KeywordItem[]> => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(Boolean);

    // Process and return top keywords
    const processedKeywords = this.processRecommendations(allRecommendations);
    
    this.logger.debug(`Validated ${processedKeywords.length} keywords from ${allRecommendations.length} recommendations.`);
    return processedKeywords;
  }

  /**
   * Get recommendations for a single keyword with proper error handling
   */
  public async getRecommendationsForKeyword(keyword: string): Promise<KeywordItem[]> {
    return await this.getAhrefsRecommendations(keyword);
  }

  /**
   * Process and refine keyword recommendations using functional programming patterns
   */
  private processRecommendations(recommendations: KeywordItem[], minVolume = 100): KeywordItem[] {
    return recommendations
      .filter(kw => kw.search_volume >= minVolume)                    // Filter by minimum volume
      .sort(this.compareKeywords)                                     // Sort by quality score
      .filter(this.createDeduplicationFilter())                      // Deduplicate
  }

  /**
   * Calculate weighted score for keyword using tiered approach (matching Python implementation)
   * Keywords with volume below MIN_SIGNIFICANT_VOLUME are deprioritized
   * Significant keywords are tiered by competition (LOW > MEDIUM > HIGH)
   */
  private scoreKeyword = (keyword: KeywordItem): number => {
    const MIN_SIGNIFICANT_VOLUME = 1000;
    const TIER_MULTIPLIER = 10_000_000; // Large multiplier ensures tier is primary sorting factor
    
    const volume = keyword.search_volume || 0;
    const competition = keyword.competition || 0.5;
    
    // Determine tier score based on volume and competition
    let tierScore: number;
    
    if (volume < MIN_SIGNIFICANT_VOLUME) {
      // Insignificant keywords are placed in tier below all others
      tierScore = -1;
    } else {
      // Significant keywords are tiered by competition (lower competition = higher tier)
      // competition ranges 0-1: LOW (0-0.4), MEDIUM (0.4-0.7), HIGH (0.7-1)
      if (competition <= 0.4) {
        tierScore = 2; // LOW competition
      } else if (competition <= 0.7) {
        tierScore = 1; // MEDIUM competition  
      } else {
        tierScore = 0; // HIGH competition
      }
    }
    
    // Final score: tier is primary factor, then volume
    return (tierScore * TIER_MULTIPLIER) + volume;
  };

  /**
   * Keyword comparison function for sorting using tiered scoring approach
   */
  private compareKeywords = (a: KeywordItem, b: KeywordItem): number => {
    return this.scoreKeyword(b) - this.scoreKeyword(a); // Higher score first
  };

  /**
   * Creates a deduplication filter using closure for state management
   */
  private createDeduplicationFilter() {
    const seen = new Set<string>();
    return (keyword: KeywordItem): boolean => {
      if (seen.has(keyword.keyword)) {
        return false;
      }
      seen.add(keyword.keyword);
      return true;
    };
  }

  /**
   * Fetch keyword recommendations from Ahrefs API via RapidAPI
   */
  private async getAhrefsRecommendations(keyword: string): Promise<KeywordItem[]> {
    const recommendations = await this.keywordsSuggestionsAPI.getRecommendedKeywordsAsync(keyword);
    
    // Transform the response to our KeywordItem format
    return recommendations.map(item => ({
      keyword: item.keyword,
      search_volume: item.searchVolume,
      difficulty: this.mapDifficultyToNumber(item.difficulty),
      cpc: 0, // Ahrefs doesn't provide CPC data
      competition: this.mapCompetitionToNumber(item.difficulty),
    }));
  }

  /**
   * Map difficulty string to numeric value (0-100)
   */
  private mapDifficultyToNumber(difficulty: string): number {
    const difficultyMap: Record<string, number> = {
      'Easy': 25,
      'Medium': 50,
      'Hard': 75,
      'Unknown': 40,
    };
    
    return difficultyMap[difficulty] || 40;
  }

  /**
   * Map competition level to numeric value (0-1)
   */
  private mapCompetitionToNumber(competitionLevel: string): number {
    const competitionMap: Record<string, number> = {
      'LOW': 0.3,
      'MEDIUM': 0.6,
      'HIGH': 0.9,
    };
    
    return competitionMap[competitionLevel] || 0.5;
  }



  /**
   * Filter keywords by search volume and difficulty thresholds
   */
  filterKeywordsByThresholds(
    keywords: KeywordItem[],
    minSearchVolume: number = 100,
    maxDifficulty: number = 80
  ): KeywordItem[] {
    return keywords.filter(
      keyword => 
        keyword.search_volume >= minSearchVolume && 
        keyword.difficulty <= maxDifficulty
    );
  }

  /**
   * Group keywords by difficulty level for better organization
   */
  groupKeywordsByDifficulty(keywords: KeywordItem[]): {
    easy: KeywordItem[];      // 0-30 difficulty
    medium: KeywordItem[];    // 31-60 difficulty
    hard: KeywordItem[];      // 61-100 difficulty
  } {
    return {
      easy: keywords.filter(kw => kw.difficulty <= 30),
      medium: keywords.filter(kw => kw.difficulty > 30 && kw.difficulty <= 60),
      hard: keywords.filter(kw => kw.difficulty > 60),
    };
  }
} 
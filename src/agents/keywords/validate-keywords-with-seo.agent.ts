import { Injectable, Logger } from '@nestjs/common';
import { KeywordsSuggestionsAPI } from './keywords-suggestions-api.service';
import Bottleneck from 'bottleneck';
import { Keyword } from './schemas/keyword.schema';
import { compareKeywords, createDeduplicationFilter } from './utils/keyword-scoring.util';

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
    
    // if (process.env.NODE_ENV != 'production') {
    //   leanKeywords = leanKeywords.slice(0, 2);
    // }

    // Progress tracking
    let completedRequests = 0;
    const totalRequests = leanKeywords.length;
    
    // Set up progress logging every 5 seconds
    const progressInterval = setInterval(() => {
      const percentage = Math.round((completedRequests / totalRequests) * 100);
      this.logger.log(`Keyword validation progress: ${completedRequests}/${totalRequests} (${percentage}%) completed`);
    }, 5000);

    // Process all keywords with rate limiting (5 requests per second)
    const recommendationPromises = leanKeywords.map(keyword => 
      this.rateLimiter.schedule(() => 
        this.keywordsSuggestionsAPI.getRecommendedKeywordsAsync(keyword)
          .finally(() => {
            completedRequests++;
          })
      )
    );

    // Use Promise.allSettled for better error handling - failed requests won't break others
    const allResults = await Promise.allSettled(recommendationPromises);
    
    // Clear the progress interval
    clearInterval(progressInterval);
    
    // Log final completion
    this.logger.log(`Keyword validation completed: ${totalRequests}/${totalRequests} (100%)`);
    
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
      .filter(createDeduplicationFilter())                           // Deduplicate
      .sort(compareKeywords)                                          // Sort by quality score (final step)
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
} 
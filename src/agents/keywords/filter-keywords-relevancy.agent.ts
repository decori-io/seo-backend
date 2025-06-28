import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { Keyword } from './schemas/keyword.schema';

// Zod schema for keyword relevancy filtering response
const KeywordRelevancySchema = z.object({
  relevant_keywords: z.array(z.string()).describe('Array of keywords that are relevant to the business'),
  irrelevant_keywords: z.array(z.string()).describe('Array of keywords that are irrelevant to the business'),
});

export type KeywordRelevancyResponse = z.infer<typeof KeywordRelevancySchema>;

export interface BusinessContext {
  business_overview: string;
  icps: string[];
  domain: string;
}

export interface KeywordFilterResult {
  relevantKeywords: Keyword[];
  irrelevantKeywords: Keyword[];
}

@Injectable()
export class FilterKeywordsRelevancy {
  private readonly logger = new Logger(FilterKeywordsRelevancy.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Filters validated keywords and returns both relevant and irrelevant keywords with AI response
   */
  async filterRelevantKeywords(
    validatedKeywords: Keyword[],
    businessContext: BusinessContext,
  ): Promise<KeywordFilterResult> {
    if (!validatedKeywords.length) {
      this.logger.warn('No validated keywords provided for filtering');
      return {
        relevantKeywords: [],
        irrelevantKeywords: [],
      };
    }

    this.logger.debug(`Filtering ${validatedKeywords.length} keywords for relevancy...`);

    // Process keywords in batches to avoid token limits
    const batchSize = 150;
    const batches: Keyword[][] = [];
    
    // Create batches
    for (let i = 0; i < validatedKeywords.length; i += batchSize) {
      batches.push(validatedKeywords.slice(i, i + batchSize));
    }

    const totalBatches = batches.length;
    this.logger.log(`Processing ${totalBatches} batches of keywords for relevancy filtering...`);

    // Progress tracking
    let completedBatches = 0;
    
    // Set up progress logging every 5 seconds
    const progressInterval = setInterval(() => {
      const percentage = Math.round((completedBatches / totalBatches) * 100);
      this.logger.log(`Keyword filtering progress: ${completedBatches}/${totalBatches} batches (${percentage}%) completed`);
    }, 5000);

    const allRelevantKeywords: Keyword[] = [];
    const allIrrelevantKeywords: Keyword[] = [];

    try {
      // Process all batches in parallel
      const batchPromises = batches.map((batch, index) => 
        this.processSingleBatch(batch, businessContext, index + 1)
          .finally(() => {
            completedBatches++;
          })
      );

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);

      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Log final completion
      this.logger.log(`Keyword filtering completed: ${totalBatches}/${totalBatches} batches (100%)`);

      // Combine results from all batches
      batchResults.forEach(batchResult => {
        allRelevantKeywords.push(...batchResult.relevantKeywords);
        allIrrelevantKeywords.push(...batchResult.irrelevantKeywords);
      });

    } catch (error) {
      // Clear the progress interval on error
      clearInterval(progressInterval);
      this.logger.error('Error during parallel batch processing:', error);
      throw error;
    }

    this.logger.debug(`Filtered to ${allRelevantKeywords.length} relevant and ${allIrrelevantKeywords.length} irrelevant out of ${validatedKeywords.length} total keywords`);
    
    return {
      relevantKeywords: allRelevantKeywords,
      irrelevantKeywords: allIrrelevantKeywords,
    };
  }

  /**
   * Processes a single batch of keywords and categorizes them using performance optimizations
   */
  private async processSingleBatch(
    batch: Keyword[],
    businessContext: BusinessContext,
    batchNumber: number,
  ): Promise<KeywordFilterResult> {
    const keywordTexts = batch.map(kw => kw.keyword);

    try {
      const filterResponse = await this.filterKeywordBatch(keywordTexts, businessContext);
      
      // Use hashmaps for O(1) lookup performance instead of includes() which is O(n)
      const relevantKeywordsSet = new Set(filterResponse.relevant_keywords);
      const irrelevantKeywordsSet = new Set(filterResponse.irrelevant_keywords);
      
      // Categorize keywords using hashmap lookups
      const relevantKeywords: Keyword[] = [];
      const irrelevantKeywords: Keyword[] = [];
      const leftBehindKeywords: Keyword[] = [];
      
      for (const keyword of batch) {
        if (relevantKeywordsSet.has(keyword.keyword)) {
          relevantKeywords.push(keyword);
        } else if (irrelevantKeywordsSet.has(keyword.keyword)) {
          irrelevantKeywords.push(keyword);
        } else {
          leftBehindKeywords.push(keyword);
          this.logger.warn(`Keyword "${keyword.keyword}" was not categorized by AI in batch ${batchNumber}`);
        }
      }
      
      // Report on left behind keywords
      if (leftBehindKeywords.length > 0) {
        this.logger.warn(`Batch ${batchNumber}: ${leftBehindKeywords.length} keywords were not categorized:
            \n${leftBehindKeywords.map(k => k.keyword).join('\n')}`);
        // # TODO: Test in the future if to Add left behind keywords to relevant to avoid losing data
        // relevantKeywords.push(...leftBehindKeywords);
      }
      
      this.logger.debug(`Batch ${batchNumber}: ${relevantKeywords.length} relevant, ${irrelevantKeywords.length} irrelevant, ${leftBehindKeywords.length} left behind out of ${batch.length} keywords`);
      
      return {
        relevantKeywords,
        irrelevantKeywords,
      };
    } catch (error) {
      this.logger.error(`Error filtering keyword batch ${batchNumber}:`, error);
      // On error, include all keywords as relevant to avoid losing data
      return {
        relevantKeywords: batch,
        irrelevantKeywords: [],
      };
    }
  }

  /**
   * Filters a batch of keywords for relevancy using AI
   */
  public async filterKeywordBatch(
    keywords: string[],
    businessContext: BusinessContext,
  ): Promise<KeywordRelevancyResponse> {
    const prompt = this.buildRelevancyPrompt(keywords, businessContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(KeywordRelevancySchema, 'keyword_relevancy'),
      temperature: 0.3, // Lower temperature for more consistent filtering
    });

    // Check for refusal (policy violation)
    if (completion.choices[0]?.message?.refusal) {
      throw new Error(`OpenAI refused request: ${completion.choices[0].message.refusal}`);
    }

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    // Parse and validate with Zod
    const parsedResponse = KeywordRelevancySchema.parse(JSON.parse(responseContent));
    
    return parsedResponse;
  }

  /**
   * Builds the prompt for keyword relevancy filtering
   */
  private buildRelevancyPrompt(keywords: string[], businessContext: BusinessContext): string {
    const { business_overview, icps, domain } = businessContext;

    return `You are a keyword relevancy expert. Filter the following keywords to keep ONLY those that are directly relevant to this business.

BUSINESS CONTEXT:
Website Domain: ${domain}
Business Summary: ${business_overview}

Ideal Customer Profiles:
${icps.map((icp, i) => `${i + 1}. ${icp}`).join('\n')}

KEYWORDS TO FILTER:
${keywords.map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

FILTERING CRITERIA:
✅ KEEP keywords that:
- Relate to the business's products/services (as described in "${domain}")
- Target the ideal customer profiles listed above
- Represent search intent relevant to this specific business
- Make sense for someone looking for what this domain/business offers
- Be very lax, and include all keywords that are related to the business, even if they are not perfect.

❌ REMOVE keywords that:
- Are completely unrelated to the business domain and services
- Target wrong audiences or industries not matching the ICPs
- Are not related to our location (specific in business context, if not, default to global)

GUIDELINES:
- YOU MUST When in doubt about a keyword's relevancy, inclusion rather than exclusion. Be selective but not overly restrictive.
- YOU MUST NOT ALTER OR REMOVE OR ADD ANY KEYWORDS FROM THE INPUT LIST. ALL MUST BE RETURNED.
- When in doubt about a keyword's relevancy, lean towards inclusion rather than exclusion
- YOU MUST categorize ALL keywords from the input list - none should be missing
- Every keyword must appear in either relevant_keywords OR irrelevant_keywords

Return the categorized keywords as JSON.`;

  }
} 
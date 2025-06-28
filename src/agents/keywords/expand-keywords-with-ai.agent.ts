import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Zod schema for contextual keyword expansion with mapping
const KeywordPairSchema = z.object({
  original: z.string().describe('The original seed keyword'),
  expanded: z.array(z.string()).describe('Array of expanded keyword variations (1-3 words each)')
});

const ContextualKeywordExpansionSchema = z.object({
  keyword_expansions: z.array(KeywordPairSchema).describe('Array of keyword pairs with original keywords and their expanded variations')
});

type ContextualKeywordExpansionResponse = z.infer<typeof ContextualKeywordExpansionSchema>;

@Injectable()
export class ExpandKeywordsWithAI {
  private readonly logger = new Logger(ExpandKeywordsWithAI.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Expands seed keywords with business context into mapped keyword variations using batch processing
   */
  async expandKeywordsWithContext(
    seedKeywords: string[],
    businessContext: any // Flexible - can be string, object, or any JSON structure
  ): Promise<ContextualKeywordExpansionResponse> {
    const batchSize = 8; // Process multiple keywords per API call to reduce costs
    const batches = this.chunkArray(seedKeywords, batchSize);
    
    const allExpansions: Record<string, string[]> = {};

    // Process batches sequentially to avoid rate limits
    for (const batch of batches) {
      try {
        this.logger.log(`Expanding keyword batch: ${batch.join(', ')}`);
        const batchExpansions = await this.expandKeywordBatch(batch, businessContext);
        Object.assign(allExpansions, batchExpansions);
      } catch (error) {
        this.logger.error(`Error expanding keyword batch: ${batch.join(', ')}`, error);
        // Add empty arrays for failed keywords to maintain structure
        batch.forEach(keyword => {
          allExpansions[keyword] = [keyword]; // Fallback to original keyword
        });
      }
    }

    this.logger.log(`Successfully expanded ${seedKeywords.length} keywords into ${Object.keys(allExpansions).length} keyword groups`);
    const response = { 
      keyword_expansions: Object.entries(allExpansions).map(([original, expanded]) => ({
        original,
        expanded
      }))
    };

    return response;
  }

  /**
   * Expands a batch of keywords with business context in a single API call
   */
  private async expandKeywordBatch(
    keywords: string[],
    businessContext: any
  ): Promise<Record<string, string[]>> {
    const prompt = this.buildContextualExpansionPrompt(keywords, businessContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(ContextualKeywordExpansionSchema, 'contextual_keyword_expansion'),
      temperature: 0.7,
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
    const parsedResponse = ContextualKeywordExpansionSchema.parse(JSON.parse(responseContent));
    
    // Filter expansions by length and ensure original keywords are included
    const filteredExpansions: Record<string, string[]> = {};
    
    for (const keywordPair of parsedResponse.keyword_expansions) {
      const filteredKeywords = keywordPair.expanded
        .filter(query => query.length <= 80 && query.trim().length > 0)
        .concat([keywordPair.original]); // Always include the original keyword
      
      filteredExpansions[keywordPair.original] = [...new Set(filteredKeywords)]; // Remove duplicates
    }

    return filteredExpansions;
  }

  /**
   * Builds the contextual prompt for keyword expansion with business context
   */
  private buildContextualExpansionPrompt(keywords: string[], businessContext: any): string {
    const contextString = typeof businessContext === 'string' 
      ? businessContext 
      : JSON.stringify(businessContext, null, 2);

    return `Business Context:
${contextString}

Expand each of these keywords into 6-8 contextually relevant variations: ${keywords.join(', ')}

Rules:
- Each expanded keyword should be 1-3 words maximum
- Focus on terms your target customers would actually search for based on the business context
- Consider the business context, target audience, and customer pain points when generating variations
- Include synonyms, related terms, and different user search intents
- Think about what people in this specific business context would type in Google
- Avoid long descriptive phrases - keep it lean and searchable
- Generate variations that capture different stages of the customer journey

Return a JSON object with keyword_expansions array where each item has the original keyword and its expanded variations.
Example format:
{
  "keyword_expansions": [
    {
      "original": "startup consulting",
      "expanded": ["consulting", "startup help", "business advice", "startup mentor"]
    },
    {
      "original": "web development", 
      "expanded": ["web dev", "website building", "coding services", "web design"]
    }
  ]
}

IMPORTANT: Return only the JSON object. No explanation or extra text.`;
  }

  /**
   * Utility function to chunk array into smaller batches for cost-effective API calls
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
} 
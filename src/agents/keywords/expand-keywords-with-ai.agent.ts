import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Zod schema for keyword expansion response
const KeywordExpansionSchema = z.object({
  queries: z.array(z.string()).describe('Array of lean, short-tail keywords (1-3 words maximum)'),
});

type KeywordExpansionResponse = z.infer<typeof KeywordExpansionSchema>;

@Injectable()
export class ExpandKeywordsWithAI {
  private readonly logger = new Logger(ExpandKeywordsWithAI.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Expands seed keywords into lean, searchable keyword variations using AI
   */
  async expandKeywords(seedKeywords: string[]): Promise<string[]> {
    const leanKeywords = new Set<string>();

    // Process all seed keywords in parallel
    const expansionPromises = seedKeywords.map(async (keyword) => {
      try {
        return await this.expandSingleKeyword(keyword);
      } catch (error) {
        this.logger.warn(`Error expanding keyword '${keyword}':`, error);
        return [];
      }
    });

    // Wait for all expansions to complete
    const allExpansionResults = await Promise.all(expansionPromises);

    // Flatten and add all expanded keywords
    allExpansionResults.forEach(expandedKeywords => {
      expandedKeywords.forEach(kw => leanKeywords.add(kw));
    });

    // Add original seed keywords
    seedKeywords.forEach(kw => leanKeywords.add(kw));
    
    return Array.from(leanKeywords).filter(kw => !kw.startsWith('ERROR:'));
  }

  /**
   * Expands a single keyword into multiple lean variations
   */
  private async expandSingleKeyword(keyword: string): Promise<string[]> {
    const prompt = this.buildExpansionPrompt(keyword);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(KeywordExpansionSchema, 'keyword_expansion'),
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
    const parsedResponse = KeywordExpansionSchema.parse(JSON.parse(responseContent));
    
    // Filter keywords by length and word count
    return parsedResponse.queries.filter(query => {
      return query.length <= 80;
    });
  }

  /**
   * Builds the prompt for keyword expansion
   */
  private buildExpansionPrompt(keyword: string): string {
    return `Generate 8-10 SHORT, LEAN keywords based on '${keyword}'. 

Rules: 
- Each keyword should be 1-3 words maximum 
- Focus on core concepts, not long phrases 
- Examples: 'startup consulting' → ['consulting', 'startup help', 'business advice'] 
- Avoid long descriptive phrases 
- Think of what people would type in Google's search box 
- Generate variations that capture different user intents
- Include synonyms and related terms

Return only the JSON object with the queries array. Do not include any explanation or extra text.`;
  }
} 
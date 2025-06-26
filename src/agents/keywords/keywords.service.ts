import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { KeywordsAnalysisSchema, KeywordsAnalysisResponse } from '../schemas/keywords-analysis.schema';
import { KeywordsAnalysisResult, KeywordItem, ICPLongTailKeywords } from '../interfaces/keywords-analysis.interface';
import { WebsiteProfilesService } from '../../website-profiles/website-profiles.service';
import { ExpandKeywordsWithAI } from './expand-keywords-with-ai.agent';
import { ValidateKeywordsWithSEO } from './validate-keywords-with-seo.agent';



@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly websiteProfilesService: WebsiteProfilesService,
    private readonly expandKeywordsAgent: ExpandKeywordsWithAI,
    private readonly validateKeywordsAgent: ValidateKeywordsWithSEO,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

    /**
   * Orchestrates the complete keyword generation, validation, and ICP-specific long-tail generation flow
   */
  async orchestrateKeywordFlow(websiteProfileId: string): Promise<KeywordsAnalysisResult> {
    try {
      this.logger.debug('Starting keyword orchestration flow...');
      
      // Step 0: Fetch websiteProfile and extract semantic analysis data
      this.logger.debug('Step 0: Fetching website profile...');
      const websiteProfile = await this.websiteProfilesService.findById(websiteProfileId);
      
      if (!websiteProfile) {
        throw new NotFoundException(`Website profile with ID ${websiteProfileId} not found`);
      }
      
      if (!websiteProfile.summary || !websiteProfile.seedKeywords || !websiteProfile.ICPs) {
        throw new BadRequestException('Website profile does not have complete semantic analysis data. Please run semantic analysis first.');
      }

      const { summary, seedKeywords, ICPs } = websiteProfile;
      
      if (!seedKeywords || !ICPs) {
        throw new BadRequestException('Semantic analysis data is incomplete. Missing seed keywords or ICPs.');
      }

      // Step 1: Generate lean seed keywords (with caching)
      this.logger.debug('Step 1: Generating lean seed keywords...');
      const leanKeywords = await this.GenerateLeanKeywords(websiteProfileId, seedKeywords);

      // Step 2: Validate keywords with external API (mocked for now)
      this.logger.debug('Step 2: Validating keywords with SEO data...');
      const validatedKeywords = await this.validateKeywordsAgent.getBulkRecommendationsForKeyword(leanKeywords);

      // Step 3: Generate ICP-specific long-tail queries
      this.logger.debug('Step 3: Generating ICP-specific long-tail queries...');
      const icpLongTail = await this.generateICPLongTail(validatedKeywords, ICPs);

      const result: KeywordsAnalysisResult = {
        lean_keywords: leanKeywords,
        validated_keywords: validatedKeywords,
        icp_long_tail: icpLongTail,
        business_context: JSON.stringify({summary, seedKeywords, ICPs}, null, 2),
        final_keywords: {
          validated_lean_keywords: validatedKeywords.slice(0, 40),
          icp_specific_long_tail: icpLongTail,
        },
      };

      this.logger.debug('Finished keyword orchestration flow.');
      return result;
    } catch (error) {
      this.logger.error('Error in keyword orchestration:', error);
      throw error;
    }
  }

  /**
   * Generates or retrieves cached lean keywords for a website profile
   */
  async GenerateLeanKeywords(websiteProfileId: string, seedKeywords?: string[]): Promise<string[]> {
    this.logger.debug(`Generating lean keywords for website profile ${websiteProfileId}...`);
    
    // Step 1: Fetch website profile
    const websiteProfile = await this.websiteProfilesService.findById(websiteProfileId);
    
    if (!websiteProfile) {
      throw new NotFoundException(`Website profile with ID ${websiteProfileId} not found`);
    }

    // Step 2: Check if lean keywords already exist
    if (websiteProfile.leanKeywords && websiteProfile.leanKeywords.length > 0) {
      this.logger.debug(`Using cached lean keywords for website profile ${websiteProfileId}`);
      return websiteProfile.leanKeywords;
    }

    // Step 3: Generate lean keywords if not cached
    this.logger.debug('Generating new lean keywords...');
    
    // Use provided seedKeywords or fall back to profile's seedKeywords
    const keywordsToExpand = seedKeywords || websiteProfile.seedKeywords;
    
    if (!keywordsToExpand || keywordsToExpand.length === 0) {
      throw new BadRequestException('No seed keywords provided and website profile does not have seed keywords');
    }

    const leanKeywords = await this.expandKeywordsAgent.expandKeywords(keywordsToExpand);

    // Step 4: Save lean keywords to the website profile
    await this.websiteProfilesService.update(websiteProfileId, {
      leanKeywords: leanKeywords,
    });

    this.logger.debug(`Generated and cached ${leanKeywords.length} lean keywords for website profile ${websiteProfileId}`);
    return leanKeywords;
  }

  /**
   * Generates ICP-specific long-tail keyword queries
   */
  private async generateICPLongTail(
    validatedKeywords: KeywordItem[],
    icps: string[]
  ): Promise<ICPLongTailKeywords> {
    const icpLongTail: ICPLongTailKeywords = {};

    for (const icp of icps) {
      icpLongTail[icp] = [];
      const topKeywords = validatedKeywords.slice(0, 15);

      for (const keywordItem of topKeywords) {
        const prompt = `Generate 2-3 long-tail search queries for the ICP '${icp}' 
based on the keyword '${keywordItem.keyword}'. 
Make them specific to this audience. 
Examples: 
- 'consulting' → 'startup consulting for ${icp}' 
- 'pitch deck' → 'pitch deck template for ${icp}' 
Keep queries 4-8 words and natural.
Return as a JSON object with "queries" array.`;

        try {
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });

          const responseContent = completion.choices[0]?.message?.content;
          if (responseContent) {
            const parsed = JSON.parse(responseContent);
            const queries = parsed.queries || [];
            icpLongTail[icp].push(...queries.slice(0, 3));
          }
        } catch (error) {
          this.logger.warn(`Error generating ICP long-tail for ${icp} and ${keywordItem.keyword}:`, error);
          icpLongTail[icp].push(`${keywordItem.keyword} for ${icp}`);
        }
      }
    }

    return icpLongTail;
  }

  /**
   * Returns mock AI summary for testing purposes
   */
  private async getMockAiSummary() {
    return {
      summary: "A business focused on providing services...",
      value_props: ["Unique value proposition 1", "Unique value proposition 2"],
      intents: ["Intent 1", "Intent 2"],
      ICPs: ["tech founders", "startup teams", "entrepreneurs"],
      seed_keywords: ["consulting", "business advice", "startup help"],
    };
  }
} 
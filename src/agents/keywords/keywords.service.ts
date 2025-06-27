import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import { WebsiteProfilesService } from '../../website-profiles/website-profiles.service';
import { ICPLongTailKeywords, KeywordItem, KeywordsAnalysisResult } from '../interfaces/keywords-analysis.interface';
import { ExpandKeywordsWithAI } from './expand-keywords-with-ai.agent';
import { KeywordEntityService } from './keyword-entity.service';
import { Keyword } from './schemas/keyword.schema';
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
    private readonly keywordEntityService: KeywordEntityService,
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

      // Step 2: Generate and cache validated keywords
      this.logger.debug('Step 2: Generating validated keywords...');
      const validatedKeywords = await this.GenerateValidatedKeywords(websiteProfileId, leanKeywords);
      
      // Step 3: Generate ICP-specific long-tail queries
      // this.logger.debug('Step 3: Generating ICP-specific long-tail queries...');
      // const icpLongTail = await this.generateICPLongTail(validatedKeywords, ICPs);

      // const result: KeywordsAnalysisResult = {
      //   lean_keywords: leanKeywords,
      //   validated_keywords: validatedKeywords,
      //   icp_long_tail: icpLongTail,
      //   business_context: JSON.stringify({summary, seedKeywords, ICPs}, null, 2),
      //   final_keywords: {
      //     validated_lean_keywords: validatedKeywords.slice(0, 40),
      //     icp_specific_long_tail: icpLongTail,
      //   },
      // };

      // this.logger.debug('Finished keyword orchestration flow.');
      // return result
      return {} as any;
    } catch (error) {
      this.logger.error('Error in keyword orchestration:', error);
      throw error;
    }
  }

  /**
   * Persists validated keywords using upsert and returns their ObjectIds
   */
  private async persistValidatedKeywords(validatedKeywords: Keyword[]): Promise<Types.ObjectId[]> {
    const keywordObjectIds: Types.ObjectId[] = [];
    
    for (const keyword of validatedKeywords) {
      try {
        // Upsert the keyword
        const persistedKeyword = await this.keywordEntityService.upsert(keyword);
        keywordObjectIds.push(persistedKeyword._id as Types.ObjectId);
      } catch (error) {
        this.logger.error(`Failed to persist keyword "${keyword.keyword}":`, error);
        // Continue with other keywords even if one fails
      }
    }
    
    this.logger.debug(`Persisted ${keywordObjectIds.length} out of ${validatedKeywords.length} keywords`);
    return keywordObjectIds;
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
   * Generates or retrieves cached validated keywords for a website profile
   */
  async GenerateValidatedKeywords(websiteProfileId: string, leanKeywords?: string[]): Promise<Keyword[]> {
    this.logger.debug(`Generating validated keywords for website profile ${websiteProfileId}...`);
    
    // Step 1: Fetch website profile with populated keywords
    const websiteProfile = await this.websiteProfilesService.findByIdWithPopulatedKeywords(websiteProfileId);
    
    if (!websiteProfile) {
      throw new NotFoundException(`Website profile with ID ${websiteProfileId} not found`);
    }

    // Step 2: Check if validated keywords already exist
    if (websiteProfile.seoValidatedKeywords && websiteProfile.seoValidatedKeywords.length > 0) {
      this.logger.debug(`Using cached validated keywords for website profile ${websiteProfileId}`);
      // Filter out any undefined populated documents and cast to Keyword[]
      return websiteProfile.seoValidatedKeywords as Keyword[];
    }

    // Step 3: Generate validated keywords if not cached
    this.logger.debug(`Generating new validated keywords... for website profile ${websiteProfileId}`);
    
    // Use provided leanKeywords or fall back to profile's leanKeywords
    const keywordsToValidate = leanKeywords || websiteProfile.leanKeywords;
    
    if (!keywordsToValidate || keywordsToValidate.length === 0) {
      throw new BadRequestException('No lean keywords provided and website profile does not have lean keywords');
    }

    // Step 4: Validate keywords with external API
    const validatedKeywords = await this.validateKeywordsAgent.getBulkRecommendationsForKeyword(keywordsToValidate);
    
    // Step 5: Persist validated keywords and get their ObjectIds
    const keywordObjectIds = await this.persistValidatedKeywords(validatedKeywords);
    
    // Step 6: Save keyword ObjectIds to the website profile
    await this.websiteProfilesService.update(websiteProfileId, {
      seoValidatedKeywords: keywordObjectIds,
    });

    this.logger.debug(`Generated and cached ${validatedKeywords.length} validated keywords for website profile ${websiteProfileId}`);
    return validatedKeywords;
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
} 
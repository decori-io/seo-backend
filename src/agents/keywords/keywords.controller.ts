import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { KeywordsAnalysisInputDto } from '../dto/keywords-analysis.dto';
import { KeywordsAnalysisResult } from '../interfaces/keywords-analysis.interface';
import { Keyword } from './schemas/keyword.schema';

@Controller('agents/keywords')
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  /**
   * Orchestrates keyword generation flow including lean keywords, validation, and ICP-specific long-tail queries
   */
  @Post('analyze')
  async analyzeKeywords(@Body() input: KeywordsAnalysisInputDto): Promise<KeywordsAnalysisResult> {
    return this.keywordsService.orchestrateKeywordFlow(input.websiteProfileId);
  }

  /**
   * Uses AI to expand and generate related keywords for a website profile based on seed keywords
   */
  @Get('expand/:websiteProfileId')
  async expandKeywords(@Param('websiteProfileId') websiteProfileId: string): Promise<string[]> {
    return this.keywordsService.GenerateLeanKeywords(websiteProfileId);
  }

  /**
   * Validates keywords with SEO data and returns enriched keyword information with search volume and difficulty
   */
  @Get('validated-keywords/:websiteProfileId')
  async getValidatedKeywords(@Param('websiteProfileId') websiteProfileId: string): Promise<Keyword[]> {
    return this.keywordsService.GenerateValidatedKeywords(websiteProfileId);
  }
} 
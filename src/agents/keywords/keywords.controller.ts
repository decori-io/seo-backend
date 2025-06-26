import { Body, Controller, Post } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { KeywordsAnalysisInputDto } from '../dto/keywords-analysis.dto';
import { KeywordsAnalysisResult } from '../interfaces/keywords-analysis.interface';

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
} 
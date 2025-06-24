import { Body, Controller, Post } from '@nestjs/common';
import { SemanticUnderstandingService } from './semantic-understanding.service';
import { SemanticAnalysisInputDto } from '../dto/semantic-analysis.dto';
import { SemanticAnalysisResult } from '../interfaces/semantic-analysis.interface';

@Controller('agents/semantic-understanding')
export class SemanticUnderstandingController {
  constructor(
    private readonly semanticUnderstandingService: SemanticUnderstandingService,
  ) {}

  /**
   * Analyzes page content to extract semantic insights for SEO and marketing
   */
  @Post('analyze')
  async analyzeContent(@Body() input: SemanticAnalysisInputDto): Promise<SemanticAnalysisResult> {
    return this.semanticUnderstandingService.semanticUnderstanding(input.context);
  }
}

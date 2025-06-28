import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { SemanticAnalysisSchema, SemanticAnalysisResponse } from '../schemas/semantic-analysis.schema';
import { SemanticAnalysisResult } from '../interfaces/semantic-analysis.interface';

@Injectable()
export class SemanticUnderstandingService {
  private readonly logger = new Logger(SemanticUnderstandingService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Performs semantic understanding analysis on page content to extract business insights
   */
  async semanticUnderstanding(context: string | object): Promise<SemanticAnalysisResult> {
    try {
      // Convert object to string if needed
      const contextData = typeof context === 'object' ? JSON.stringify(context) : context;

      const prompt = this.buildAnalysisPrompt(contextData);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: zodResponseFormat(SemanticAnalysisSchema, 'semantic_analysis'),
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
      const parsedResponse = SemanticAnalysisSchema.parse(JSON.parse(responseContent));

      // Zod automatically validates the response structure
      return {
        ai_summary: parsedResponse,
      };
    } catch (error) {
      console.error('Error in semantic understanding:', error); 
      throw error;
    }
  }

  /**
   * Builds the analysis prompt with improved structure and clarity
   */
  private buildAnalysisPrompt(pagesData: string): string {
    return `My life depends on it, you must do your best, You are a world-class product marketer, SEO expert, and content strategist. 

Analyze the following website content and return a structured JSON object with business insights for SEO and marketing strategy.

The response format and field requirements are defined by the schema - follow those specifications exactly.

Page content: ${pagesData}`;
  }
}

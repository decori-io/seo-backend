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
        model: 'gpt-4o-2024-08-06',
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
    return `You are a world-class product marketer, SEO expert, and content strategist. Given the following product or website content, return a structured JSON object with the following fields:

summary: Write a natural, human-sounding response as if you're giving friendly, insightful Slack-style feedback directly to the business owner. Format as multiple sentence with proper line breaks (\\n\\n between sentence or if sentence is too long), each paragraph (1-2 sentences) should be short and concised.
 Follow these guidelines:
- Start with 'So I took a look at [Business Name]...' and use the actual business name throughout
- First sentence: Compliment the business setup and product/service range, mentioning specific products or services by name
- Second sentence: Highlight standout customer-friendly features (experience, warranties, trial periods, service quality, unique offerings, etc.)
- Third sentence: Suggest blog content ideas around the business niche (buying guides, care tips, comparison articles, industry insights)
- Fourth sentence: Provide insight into what the target audience is likely looking for and how the business can address those needs

value_props: 7–10 unique, specific value propositions (avoid generic claims; focus on what truly differentiates this product/site).
intents: 7–10 distinct user intents — what visitors are trying to solve, achieve, or improve (be varied and creative).
ICPs: 5 ideal customer profiles in 2–3 words each (no 'and', 'or', or vague categories like 'anyone who runs'; keep sharp like 'tech founders', 'urban parents', etc).
seed_keywords: 5 creative, short-tail search keywords that would serve as strong seeds for keyword expansion APIs.

Return only the JSON object. Do not include any explanation or extra commentary.

Page content: ${pagesData}`;
  }
}

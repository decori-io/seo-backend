import { z } from 'zod';

export const KeywordItemSchema = z.object({
  keyword: z.string(),
  search_volume: z.number(),
  difficulty: z.number(),
  cpc: z.number(),
  competition: z.number(),
});

export const ICPLongTailSchema = z.record(z.array(z.string()));

export const KeywordsAnalysisSchema = z.object({
  lean_keywords: z.array(z.string()).describe('Generated lean seed keywords (1-3 words maximum)'),
  validated_keywords: z.array(KeywordItemSchema).describe('Keywords validated with SEO data from external API'),
  icp_long_tail: ICPLongTailSchema.describe('ICP-specific long-tail keyword queries'),
  business_context: z.string().describe('JSON string of business context and summary'),
  final_keywords: z.object({
    validated_lean_keywords: z.array(KeywordItemSchema),
    icp_specific_long_tail: ICPLongTailSchema,
  }),
});

export type KeywordsAnalysisResponse = z.infer<typeof KeywordsAnalysisSchema>; 
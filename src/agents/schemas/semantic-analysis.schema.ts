import { z } from 'zod';

export const SemanticAnalysisSchema = z.object({
  summary: z.string().describe(`
    summary: Write a natural, human-sounding response as if you're giving friendly, insightful Slack-style feedback directly to the business owner. Format as multiple sentence with proper line breaks (\\n\\n between sentence or if sentence is too long), each paragraph (1-2 sentences) should be short and concised.
 Follow these guidelines:
- Start with 'So I took a look at [Business Name]...' and use the actual business name throughout
- First sentence: Compliment the business setup and product/service range, mentioning specific products or services by name
- Second sentence: Highlight standout customer-friendly features (experience, warranties, trial periods, service quality, unique offerings, etc.)
- Third sentence: Suggest blog content ideas around the business niche (buying guides, care tips, comparison articles, industry insights)
- Fourth sentence: Provide insight into what the target audience is likely looking for and how the business can address those needs
`),
  value_props: z.array(z.string()).describe('7-10 unique, highly specific value propositions (avoid generic or repetitive points; focus on what truly differentiates this product)'),
  intents: z.array(z.string()).describe('7-10 distinct user intents (what are people trying to achieve, solve, or improve by using this product? Be creative and cover a range of motivations)'),
  ICPs: z.array(z.string()).describe(`5 ideal customer profiles (MUST! be super mega concise, and not "and", "or", "etc", e.g., "urban runners", "tech workers", "pregnant women", not just "anyone who runs")`),
  seed_keywords: z.array(z.string()).describe(`5 creative, very short tail search keywords that a savvy marketer would target, We're passing it into an keyword expansion api later. so each keyword must be concised`),
});

export type SemanticAnalysisResponse = z.infer<typeof SemanticAnalysisSchema>; 
import { z } from 'zod';

export const SemanticAnalysisSchema = z.object({
  summary: z.string().describe(`Write a natural, human-sounding paragraph as if you're giving friendly, insightful Slack-style feedback. Start with 'So I took a look at...' and include:
- A compliment on their setup and product range
- A highlight of standout customer-friendly features (e.g. warranties, trial periods, service quality)
- Blog content ideas around their product niche (e.g. buying guides, care tips, comparison articles)
- Quick insight into what their target audience is likely looking for

`),
  value_props: z.array(z.string()).describe('7-10 unique, highly specific value propositions (avoid generic or repetitive points; focus on what truly differentiates this product)'),
  intents: z.array(z.string()).describe('7-10 distinct user intents (what are people trying to achieve, solve, or improve by using this product? Be creative and cover a range of motivations)'),
  ICPs: z.array(z.string()).describe(`5 ideal customer profiles (MUST! be super mega concise, and not "and", "or", "etc", e.g., "urban runners", "tech workers", "pregnant women", not just "anyone who runs")`),
  seed_keywords: z.array(z.string()).describe(`5 creative, very short tail search keywords that a savvy marketer would target, We're passing it into an keyword expansion api later. so each keyword must be concised`),
});

export type SemanticAnalysisResponse = z.infer<typeof SemanticAnalysisSchema>; 
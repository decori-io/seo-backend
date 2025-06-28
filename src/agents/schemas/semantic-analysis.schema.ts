import { z } from 'zod';

export const SemanticAnalysisSchema = z.object({
  shortAbout: z.string().describe(`
    shortAbout: Write a natural, human-sounding response as if you're giving friendly, insightful Slack-style feedback directly to the business owner. Format as multiple sentence with proper line breaks (\\n\\n between sentence or if sentence is too long), each paragraph (1-2 sentences) should be short and concised.
 Follow these guidelines:
- Start with 'So I took a look at [Business Name]...' and use the actual business name throughout
- First sentence: Compliment the business setup and product/service range, mentioning specific products or services by name
- Second sentence: Highlight standout customer-friendly features (experience, warranties, trial periods, service quality, unique offerings, etc.)
- Third sentence: Suggest blog content ideas around the business niche (buying guides, care tips, comparison articles, industry insights)
- Fourth sentence: Provide insight into what the target audience is likely looking for and how the business can address those needs
`),
  business_overview: z.string().describe(`
    business_overview: Provide a comprehensive, structured analysis of the business based on all available page content. This should be a detailed summary that includes:
- Company name and core business model (what they do, how they operate)
- Primary products/services offered with specific details
- Target market and customer base analysis
- Geographic coverage: Clearly state if this is a global business OR specify which countries/regions they operate in based on the content (look for shipping info, contact details, currency, language, local phone numbers, etc.)
- Unique value propositions and competitive advantages
- Business maturity indicators (established company vs startup, scale of operations)
- Key business insights that would be valuable for SEO and marketing strategy
Format this as a comprehensive paragraph that gives context for strategic decision-making.
`),
  value_props: z.array(z.string()).describe('10 unique, highly specific value propositions (avoid generic or repetitive points; focus on what truly differentiates this product)'),
  intents: z.array(z.string()).describe('10 distinct user intents (what are people trying to achieve, solve, or improve by using this product? Be creative and cover a range of motivations)'),
  ICPs: z.array(z.string()).describe(`10 ideal customer profiles (MUST! be super mega concise, and not "and", "or", "etc", e.g., "urban runners", "tech workers", "pregnant women", not just "anyone who runs")`),
  seed_keywords: z.array(z.string()).describe(`5 creative, very short tail search keywords that a savvy marketer would target, We're passing it into an keyword expansion api later. so each keyword must be concised`),
});

export type SemanticAnalysisResponse = z.infer<typeof SemanticAnalysisSchema>; 
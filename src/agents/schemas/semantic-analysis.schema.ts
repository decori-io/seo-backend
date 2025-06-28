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
  businessOverview: z.string().describe(`
    businessOverview: Provide an EXTREMELY detailed, elaborate, and specific analysis of the business based on ALL available page content. DO NOT use generic phrases like "covering everything from X to Y" or "ranging from A to B". Instead, be hyper-specific about what you actually found on their pages. This should be a comprehensive deep-dive that includes:

- Company name and EXACT business model details: What specifically do they do? How exactly do they operate? What specific processes, methodologies, or approaches do they use? Quote specific language from their site.
- Primary products/services with SPECIFIC details: Don't just list categories - describe the actual offerings, pricing models, service packages, specific features, delivery methods, timelines, etc. Be concrete.
- Target market analysis with SPECIFICS: Not just "entrepreneurs" but exactly what type - what industries, what stage, what size, what challenges they face. Use specific demographic and psychographic details found on the site.
- Geographic coverage with EVIDENCE: Don't just say "global", global is default if nothing is specified - specify exactly which countries/regions based on concrete evidence like: shipping destinations, office locations, local phone numbers, currencies mentioned, language options, local partnerships, case studies from specific regions, etc.
- Unique value propositions with CONCRETE examples: What exactly makes them different? Quote specific claims, methodologies, guarantees, results, testimonials, case studies, or unique processes mentioned.
- Business maturity and scale indicators: Specific evidence of company size, years in business, number of clients served, team size, office locations, partnerships, certifications, awards, etc.
- Strategic insights for SEO/marketing: Specific opportunities, content gaps, competitive advantages, keyword opportunities, content themes that would resonate based on their actual messaging and positioning.

Format this as 3-4 detailed paragraphs with specific facts, figures, quotes, and evidence from their actual content. Avoid generalizations and focus on concrete, actionable intelligence that demonstrates deep understanding of their business.
`),
  value_props: z.array(z.string()).describe('10 unique, highly specific value propositions (avoid generic or repetitive points; focus on what truly differentiates this product)'),
  intents: z.array(z.string()).describe('10 distinct user intents (what are people trying to achieve, solve, or improve by using this product? Be creative and cover a range of motivations)'),
  ICPs: z.array(z.string()).describe(`10 ideal customer profiles (MUST! be super mega concise, and not "and", "or", "etc", e.g., "urban runners", "tech workers", "pregnant women", not just "anyone who runs")`),
  seed_keywords: z.array(z.string()).describe(`5 creative, very short tail search keywords that a savvy marketer would target, We're passing it into an keyword expansion api later. so each keyword must be concised`),
});

export type SemanticAnalysisResponse = z.infer<typeof SemanticAnalysisSchema>; 
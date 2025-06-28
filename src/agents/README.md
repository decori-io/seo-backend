# Agents Module

This module contains AI-powered agents for SEO and content analysis using OpenAI's structured outputs with Zod schema validation.

## Semantic Understanding Agent

The Semantic Understanding Agent analyzes page content to extract business insights for SEO and marketing purposes. It uses Zod schemas for robust output validation and type safety.

### Features

- ✅ **Type-safe responses** with Zod schema validation
- ✅ **Structured outputs** via OpenAI's latest API
- ✅ **Error handling** with graceful fallbacks
- ✅ **Policy violation detection** with refusal handling
- ✅ **Comprehensive testing** with mocked OpenAI calls

### API Endpoint

```
POST /agents/semantic-understanding/analyze
```

### Request Body

```json
{
  "context": "string or object - the page content to analyze"
}
```

### Response

The response is validated against a Zod schema ensuring type safety:

```json
{
  "ai_summary": {
    "shortAbout": "A concise, natural Slack-style feedback message to the business owner",
    "businessOverview": "A comprehensive analysis of the business including geographic coverage and strategic insights",
    "value_props": ["7-10 unique, highly specific value propositions"],
    "intents": ["7-10 distinct user intents"],
    "ICPs": ["5 ideal customer profiles (concise)"],
    "seed_keywords": ["5 creative, short tail search keywords"]
  }
}
```
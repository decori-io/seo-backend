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
    "summary": "A concise, one-sentence summary of the product and its unique context",
    "value_props": ["7-10 unique, highly specific value propositions"],
    "intents": ["7-10 distinct user intents"],
    "ICPs": ["5 ideal customer profiles (concise)"],
    "seed_keywords": ["5 creative, short tail search keywords"]
  }
}
```

### Environment Variables

Make sure to set the following environment variable:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Schema Validation

The agent uses Zod schemas for robust validation:

```typescript
import { SemanticAnalysisSchema } from './agents/schemas/semantic-analysis.schema';

// The schema ensures all required fields are present and correctly typed
const validatedData = SemanticAnalysisSchema.parse(apiResponse);
```

### Usage Examples

#### Via Dependency Injection

```typescript
import { SemanticUnderstandingService } from './agents';

// Via dependency injection
constructor(private semanticService: SemanticUnderstandingService) {}

// Analyze content
const result = await this.semanticService.semanticUnderstanding(pageContent);
```

#### Direct Schema Usage

```typescript
import { SemanticAnalysisSchema } from './agents';

// Validate external data
try {
  const validated = SemanticAnalysisSchema.parse(externalData);
  console.log('Data is valid:', validated);
} catch (error) {
  console.error('Invalid data structure:', error);
}
```

### Example cURL

```bash
curl -X POST http://localhost:3000/agents/semantic-understanding/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Your product page content here..."
  }'
```

### Technical Details

- **Model**: Uses `gpt-4o-2024-08-06` for structured outputs
- **Validation**: Zod schema ensures response integrity
- **Error Handling**: Graceful degradation with detailed error messages
- **Testing**: Comprehensive test suite with mocked dependencies 
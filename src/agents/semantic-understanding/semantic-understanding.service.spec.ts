import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticUnderstandingService } from './semantic-understanding.service';
import { SemanticAnalysisSchema } from '../schemas/semantic-analysis.schema';

// Mock the OpenAI module
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

describe('SemanticUnderstandingService', () => {
  let service: SemanticUnderstandingService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticUnderstandingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SemanticUnderstandingService>(SemanticUnderstandingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle string context input', async () => {
    // Create a valid response that matches our Zod schema
    const validResponse = {
      summary: 'Test product summary',
      value_props: ['Test value prop 1', 'Test value prop 2'],
      intents: ['Test intent 1', 'Test intent 2'],
      ICPs: ['Test ICP 1', 'Test ICP 2'],
      seed_keywords: ['test keyword 1', 'test keyword 2']
    };

    // Mock OpenAI response
    const mockCompletion = {
      choices: [{
        message: {
          content: JSON.stringify(validResponse),
          refusal: null,
        }
      }]
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

    const result = await service.semanticUnderstanding('Test product content');

    expect(result).toBeDefined();
    expect(result.ai_summary).toBeDefined();
    expect(result.ai_summary.summary).toBe('Test product summary');
    expect(Array.isArray(result.ai_summary.value_props)).toBe(true);
    expect(Array.isArray(result.ai_summary.intents)).toBe(true);
    expect(Array.isArray(result.ai_summary.ICPs)).toBe(true);
    expect(Array.isArray(result.ai_summary.seed_keywords)).toBe(true);
  });

  it('should handle object context input by stringifying it', async () => {
    // Create a valid response that matches our Zod schema
    const validResponse = {
      summary: 'Test product summary',
      value_props: ['Test value prop'],
      intents: ['Test intent'],
      ICPs: ['Test ICP'],
      seed_keywords: ['test keyword']
    };

    const mockCompletion = {
      choices: [{
        message: {
          content: JSON.stringify(validResponse),
          refusal: null,
        }
      }]
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

    const contextObject = { title: 'Test Product', description: 'Test Description' };
    const result = await service.semanticUnderstanding(contextObject);

    expect(result).toBeDefined();
    expect(result.ai_summary).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Mock OpenAI to throw an error
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    const result = await service.semanticUnderstanding('Test content');

    expect(result).toBeDefined();
    expect(result.ai_summary.summary).toContain('ERROR:');
    expect(result.ai_summary.value_props).toEqual([]);
    expect(result.ai_summary.intents).toEqual([]);
    expect(result.ai_summary.ICPs).toEqual([]);
    expect(result.ai_summary.seed_keywords).toEqual([]);
  });

  it('should handle OpenAI refusal', async () => {
    // Mock OpenAI response with refusal
    const mockCompletion = {
      choices: [{
        message: {
          content: null,
          refusal: 'Content policy violation',
        }
      }]
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

    const result = await service.semanticUnderstanding('Test content');

    expect(result).toBeDefined();
    expect(result.ai_summary.summary).toContain('ERROR:');
    expect(result.ai_summary.summary).toContain('OpenAI refused request');
  });

  it('should validate response against Zod schema', () => {
    // Test that our schema validates correctly
    const validData = {
      summary: 'Test summary',
      value_props: ['prop1', 'prop2'],
      intents: ['intent1', 'intent2'],
      ICPs: ['icp1', 'icp2'],
      seed_keywords: ['keyword1', 'keyword2']
    };

    expect(() => SemanticAnalysisSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid data with Zod schema', () => {
    // Test that our schema rejects invalid data
    const invalidData = {
      summary: 'Test summary',
      // Missing required fields
    };

    expect(() => SemanticAnalysisSchema.parse(invalidData)).toThrow();
  });
});

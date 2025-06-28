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
      shortAbout: 'Test product short about',
      businessOverview: 'Test business overview',
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
    expect(result.ai_summary.shortAbout).toBe('Test product short about');
    expect(result.ai_summary.businessOverview).toBe('Test business overview');
    expect(Array.isArray(result.ai_summary.value_props)).toBe(true);
    expect(Array.isArray(result.ai_summary.intents)).toBe(true);
    expect(Array.isArray(result.ai_summary.ICPs)).toBe(true);
    expect(Array.isArray(result.ai_summary.seed_keywords)).toBe(true);
  });

  it('should handle object context input by stringifying it', async () => {
    // Create a valid response that matches our Zod schema
    const validResponse = {
      shortAbout: 'Test product short about',
      businessOverview: 'Test business overview',
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

    await expect(service.semanticUnderstanding('Test content')).rejects.toThrow('API Error');
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

    await expect(service.semanticUnderstanding('Test content')).rejects.toThrow('OpenAI refused request: Content policy violation');
  });

  it('should validate response against Zod schema', () => {
    // Test that our schema validates correctly
    const validData = {
      shortAbout: 'Test short about',
      businessOverview: 'Test business overview',
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
      shortAbout: 'Test short about',
      // Missing required fields
    };

    expect(() => SemanticAnalysisSchema.parse(invalidData)).toThrow();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ValidateKeywordsWithSEO } from './validate-keywords-with-seo.agent';
import { KeywordsSuggestionsAPI } from './keywords-suggestions-api.service';
import { Keyword, KeywordDifficulty } from './schemas/keyword.schema';

describe('ValidateKeywordsWithSEO - Hybrid Keyword Scoring', () => {
  let service: ValidateKeywordsWithSEO;
  let mockKeywordsSuggestionsAPI: jest.Mocked<KeywordsSuggestionsAPI>;

  beforeEach(async () => {
    const mockAPI = {
      getRecommendedKeywordsAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateKeywordsWithSEO,
        { provide: KeywordsSuggestionsAPI, useValue: mockAPI },
      ],
    }).compile();

    service = module.get<ValidateKeywordsWithSEO>(ValidateKeywordsWithSEO);
    mockKeywordsSuggestionsAPI = module.get(KeywordsSuggestionsAPI);
  });

  describe('Hybrid Keyword Scoring Specification', () => {
    const testKeywords: Keyword[] = [
      { keyword: '100k_high', searchVolume: 100000, difficulty: KeywordDifficulty.HIGH },
      { keyword: '10k_medium', searchVolume: 10000, difficulty: KeywordDifficulty.MEDIUM },
      { keyword: '1k_low', searchVolume: 1000, difficulty: KeywordDifficulty.LOW },
      { keyword: '1m_high', searchVolume: 1000000, difficulty: KeywordDifficulty.HIGH },
      { keyword: '10k_low', searchVolume: 10000, difficulty: KeywordDifficulty.LOW },
      { keyword: '100k_medium', searchVolume: 100000, difficulty: KeywordDifficulty.MEDIUM },
      { keyword: '1k_medium', searchVolume: 1000, difficulty: KeywordDifficulty.MEDIUM },
      { keyword: '100_low', searchVolume: 100, difficulty: KeywordDifficulty.LOW },
      { keyword: '10k_high', searchVolume: 10000, difficulty: KeywordDifficulty.HIGH },
      { keyword: '100k_low', searchVolume: 100000, difficulty: KeywordDifficulty.LOW },
    ];

    it('should sort keywords by tier and significance following hybrid strategy', () => {
      /**
       * Hybrid strategy:
       * 1. Keywords with volume < 1000 are deprioritized to the bottom
       * 2. All other keywords are sorted into strict difficulty tiers (LOW > MEDIUM > HIGH)
       * 3. Search volume is used as tie-breaker within each tier
       */
      
      // Act
      const sortedKeywords = service.sortKeywordsByScore(testKeywords);
      
      // Assert
      const actualOrder = sortedKeywords.map(kw => kw.keyword);
      
      const expectedOrder = [
        // LOW difficulty tier (easiest to rank) - sorted by volume desc
        '100k_low',
        '10k_low', 
        '1k_low',
        // MEDIUM difficulty tier - sorted by volume desc
        '100k_medium',
        '10k_medium',
        '1k_medium',
        // HIGH difficulty tier (hardest to rank) - sorted by volume desc
        '1m_high',
        '100k_high',
        '10k_high',
        // Below threshold tier (volume < 1000) - deprioritized
        '100_low',
      ];
      
      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should calculate correct tier scores and add ourScore', () => {
      const lowDifficultyKeyword: Keyword = { keyword: 'test', searchVolume: 5000, difficulty: KeywordDifficulty.LOW };
      const mediumDifficultyKeyword: Keyword = { keyword: 'test', searchVolume: 5000, difficulty: KeywordDifficulty.MEDIUM };
      const highDifficultyKeyword: Keyword = { keyword: 'test', searchVolume: 5000, difficulty: KeywordDifficulty.HIGH };
      const lowVolumeKeyword: Keyword = { keyword: 'test', searchVolume: 500, difficulty: KeywordDifficulty.LOW };

      const lowScore = service.scoreKeyword(lowDifficultyKeyword);
      const mediumScore = service.scoreKeyword(mediumDifficultyKeyword);
      const highScore = service.scoreKeyword(highDifficultyKeyword);
      const lowVolumeScore = service.scoreKeyword(lowVolumeKeyword);

      // Low difficulty should score highest among significant volumes
      expect(lowScore).toBeGreaterThan(mediumScore);
      expect(mediumScore).toBeGreaterThan(highScore);
      
      // All significant volume keywords should score higher than low volume
      expect(highScore).toBeGreaterThan(lowVolumeScore);
    });

    it('should add ourScore to keywords when sorting', () => {
      const sortedKeywords = service.sortKeywordsByScore(testKeywords);
      
      // All keywords should have ourScore added
      sortedKeywords.forEach((keyword: any) => {
        expect(keyword.ourScore).toBeDefined();
        expect(typeof keyword.ourScore).toBe('number');
      });
      
      // ourScores should be in descending order (highest first)
      for (let i = 1; i < sortedKeywords.length; i++) {
        expect((sortedKeywords[i-1] as any).ourScore!).toBeGreaterThanOrEqual((sortedKeywords[i] as any).ourScore!);
      }
    });
  });
}); 
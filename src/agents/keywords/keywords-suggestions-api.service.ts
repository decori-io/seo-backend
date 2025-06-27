import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeywordDifficulty, Keyword } from './schemas/keyword.schema';
import { CreateKeywordDto } from './dto/keyword.dto';

// Type definitions matching the Python implementation
interface KeywordSuggestion {
  keyword: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Unknown';
  volume: string;
  lastUpdated?: string;
}

interface RapidApiKeywordResponse {
  status: string;
  Ideas: KeywordSuggestion[];
  Questions: KeywordSuggestion[];
}

interface RapidAHRefsKeyword {
  keyword: string;
  searchVolumeStr: string;
  searchVolume: number;
  difficulty: KeywordDifficulty; 
  lastUpdated?: string;
}

@Injectable()
export class KeywordsSuggestionsAPI {
  private readonly logger = new Logger(KeywordsSuggestionsAPI.name);
  private readonly AHREFS_API_URL = 'https://ahrefs2.p.rapidapi.com/keyword_suggestions';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Asynchronously fetch recommended keywords from Ahrefs API via RapidAPI and return as Keyword entities
   */
  async getRecommendedKeywordsAsync(
    seedKeyword: string,
    country: string = 'us',
    searchEngine: string = 'google'
  ): Promise<Keyword[]> {
    const rapidApiKey = this.configService.get<string>('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not set in environment variables.');
    }

    const headers = {
      'x-rapidapi-host': 'ahrefs2.p.rapidapi.com',
      'x-rapidapi-key': rapidApiKey,
    };

    const params = new URLSearchParams({
      keyword: seedKeyword,
      country: country,
      se: searchEngine,
    });

    const response = await fetch(`${this.AHREFS_API_URL}?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Ahrefs API error: ${response.status} ${response.statusText}`);
    }

    const apiData: RapidApiKeywordResponse = await response.json();
    const keywords = this.AhrefsResponseToKeywordsEntity(apiData);
    
    return keywords;
  }

  /**
   * Map volume string to numeric value
   */
  private mapVolume(volumeStr?: string): number {
    if (!volumeStr) {
      return 0;
    }

    try {
      // Remove comparison operators
      const cleanStr = volumeStr.replace(/[<>]/g, '').trim();
      
      // Convert suffixes to numbers
      const multipliers: Record<string, number> = {
        'k': 1000,
        'K': 1000,
        'M': 1000000,
      };
      
      let value: number | null = null;
      
      for (const [suffix, multiplier] of Object.entries(multipliers)) {
        if (cleanStr.includes(suffix)) {
          const number = parseFloat(cleanStr.replace(suffix, ''));
          value = Math.floor(number * multiplier);
          break;
        }
      }
      
      // If no suffix found, try to convert directly to integer
      if (value === null) {
        value = Math.floor(parseFloat(cleanStr));
      }

      // If it was a '<' comparison, return the value as is
      // If it was a '>' comparison, add 1 to the value to indicate "greater than"
      if (volumeStr.includes('<')) {
        return value;
      } else if (volumeStr.includes('>')) {
        return value + 1;
      }
        
      return value;
      
    } catch (error) {
      this.logger.error(`Please add volume of value "${volumeStr}" to the volume mapper (to a number)`);
      return 0;
    }
  }

  /**
   * Map Ahrefs difficulty string to KeywordDifficulty enum
   */
  private mapDifficulty(difficulty?: string): KeywordDifficulty {
    if (!difficulty) {
      return KeywordDifficulty.UNKNOWN;
    }
    
    const difficultyMap: Record<string, KeywordDifficulty> = {
      'Easy': KeywordDifficulty.LOW,
      'Medium': KeywordDifficulty.MEDIUM, 
      'Hard': KeywordDifficulty.HIGH,
      'Unknown': KeywordDifficulty.UNKNOWN,
    };
    
    return difficultyMap[difficulty] || KeywordDifficulty.UNKNOWN;
  }

  /**
   * Processes the JSON response from Ahrefs API and maps to Keyword entity format
   */
  private AhrefsResponseToKeywordsEntity(data: RapidApiKeywordResponse): Keyword[] {
    const results: Keyword[] = [];
    
    try {
      const allItems = [...(data.Ideas || []), ...(data.Questions || [])];
      
      for (const item of allItems) {
        const volumeStr = item.volume;
        const processedKeyword: Keyword = {
          keyword: item.keyword,
          searchVolume: this.mapVolume(volumeStr),
          difficulty: this.mapDifficulty(item.difficulty),
          lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : undefined,
          provider: 'rapidapi-ahrefs',
          rawSource: item
        };
        results.push(processedKeyword);
      }
    } catch (error) {
      this.logger.error(`Ahrefs API error: ${error.message}`);
    }
    
    return results;
  }
} 
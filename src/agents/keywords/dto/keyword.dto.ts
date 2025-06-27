import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { KeywordDifficulty } from '../schemas/keyword.schema';

export class CreateKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @IsNumber()
  @Min(0)
  searchVolume: number;

  @IsEnum(KeywordDifficulty)
  difficulty: KeywordDifficulty;

  @IsOptional()
  lastUpdated?: Date;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  rawSource?: any;
}

export class KeywordResponseDto {
  keyword: string;
  searchVolume: number;
  difficulty: KeywordDifficulty;
  lastUpdated?: Date;
  provider?: string;
  rawSource?: any;
  createdAt: Date;
  updatedAt: Date;
} 
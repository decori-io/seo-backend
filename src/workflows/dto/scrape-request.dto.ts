import { IsNotEmpty, IsString } from 'class-validator';

export class ScrapeRequestDto {
  @IsString()
  @IsNotEmpty()
  websiteProfileID: string;
} 
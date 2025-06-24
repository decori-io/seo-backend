import { IsNotEmpty, IsString } from 'class-validator';

// DTO for creating a new scrape job for a website profile
export class CreateScrapeJobDto {
  @IsString()
  @IsNotEmpty()
  websiteProfileId: string;

  @IsString()
  @IsNotEmpty()
  domain: string;
} 
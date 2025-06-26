import { IsNotEmpty, IsString } from 'class-validator';
 
export class KeywordsAnalysisInputDto {
  @IsNotEmpty()
  @IsString()
  websiteProfileId: string;
} 
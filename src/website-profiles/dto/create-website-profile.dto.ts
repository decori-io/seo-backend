import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWebsiteProfileDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  userId: string;
} 
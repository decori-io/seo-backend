import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateWebsiteProfileDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
} 
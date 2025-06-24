import { IsNotEmpty } from 'class-validator';

export class SemanticAnalysisInputDto {
  @IsNotEmpty()
  context: string | object;
} 
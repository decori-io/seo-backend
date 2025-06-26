import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticUnderstandingService } from './semantic-understanding/semantic-understanding.service';
import { SemanticUnderstandingController } from './semantic-understanding/semantic-understanding.controller';
import { KeywordsService } from './keywords/keywords.service';
import { KeywordsController } from './keywords/keywords.controller';
import { ExpandKeywordsWithAI } from './keywords/expand-keywords-with-ai.agent';
import { ValidateKeywordsWithSEO } from './keywords/validate-keywords-with-seo.agent';
import { KeywordsSuggestionsAPI } from './keywords/keywords-suggestions-api.service';
import { WebsiteProfilesModule } from '../website-profiles/website-profiles.module';

@Module({
  imports: [ConfigModule, forwardRef(() => WebsiteProfilesModule)],
  providers: [SemanticUnderstandingService, KeywordsService, ExpandKeywordsWithAI, ValidateKeywordsWithSEO, KeywordsSuggestionsAPI],
  controllers: [SemanticUnderstandingController, KeywordsController],
  exports: [SemanticUnderstandingService, KeywordsService, ExpandKeywordsWithAI, ValidateKeywordsWithSEO, KeywordsSuggestionsAPI],
})
export class AgentsModule {}

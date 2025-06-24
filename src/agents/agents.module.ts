import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticUnderstandingService } from './semantic-understanding/semantic-understanding.service';
import { SemanticUnderstandingController } from './semantic-understanding/semantic-understanding.controller';

@Module({
  imports: [ConfigModule],
  providers: [SemanticUnderstandingService],
  controllers: [SemanticUnderstandingController],
  exports: [SemanticUnderstandingService],
})
export class AgentsModule {}

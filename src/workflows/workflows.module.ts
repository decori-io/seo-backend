import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WebsiteProfilesModule } from '../website-profiles/website-profiles.module';
import { SharedModule } from '../shared';
import { ScrapedPagesModule } from '../scraped-pages/scraped-pages.module';

@Module({
  imports: [WebsiteProfilesModule, SharedModule, ScrapedPagesModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}

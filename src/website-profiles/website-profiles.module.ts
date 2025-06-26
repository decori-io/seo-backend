import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteProfilesService } from './website-profiles.service';
import { WebsiteProfilesController } from './website-profiles.controller';
import { WebsiteProfile, WebsiteProfileSchema } from './schemas/website-profile.schema';
import { ScrapedPage, ScrapedPageSchema } from '../scraped-pages/schemas/scraped-page.schema';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebsiteProfile.name, schema: WebsiteProfileSchema },
      { name: ScrapedPage.name, schema: ScrapedPageSchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [WebsiteProfilesController],
  providers: [WebsiteProfilesService],
  exports: [WebsiteProfilesService],
})
export class WebsiteProfilesModule {}

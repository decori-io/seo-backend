import { Module } from '@nestjs/common';
import { ScrapedPagesController } from './scraped-pages.controller';
import { ScrapedPagesService } from './scraped-pages.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScrapedPage, ScrapedPageSchema } from './schemas/scraped-page.schema';
import { ScrapeJob, ScrapeJobSchema } from './schemas/scrape-job.schema';
import { SharedModule } from '../shared';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScrapedPage.name, schema: ScrapedPageSchema },
      { name: ScrapeJob.name, schema: ScrapeJobSchema },
    ]),
    SharedModule,
  ],
  controllers: [ScrapedPagesController],
  providers: [ScrapedPagesService],
  exports: [ScrapedPagesService],
})
export class ScrapedPagesModule {}

import { Module } from '@nestjs/common';
import { ScrapedPagesController } from './scraped-pages.controller';
import { ScrapedPagesService } from './scraped-pages.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScrapedPage, ScrapedPageSchema } from './schemas/scraped-page.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ScrapedPage.name, schema: ScrapedPageSchema }])],
  controllers: [ScrapedPagesController],
  providers: [ScrapedPagesService],
  exports: [ScrapedPagesService],
})
export class ScrapedPagesModule {}

import { Module } from '@nestjs/common';
import { CrawlService } from './services/crawl.service';

@Module({
  providers: [
    CrawlService,
    {
      provide: 'FIRE_CRAWL_API_KEY',
      useValue: process.env.FIRE_CRAWL_API_KEY,
    },
  ],
  exports: [CrawlService],
})
export class SharedModule {} 
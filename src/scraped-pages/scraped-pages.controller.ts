import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { Types } from 'mongoose';
import { ScrapedPagesService } from './scraped-pages.service';
import { CreateScrapeJobDto } from './dto/create-scrape-job.dto';
import { ScrapeJobDocument } from './schemas/scrape-job.schema';

@Controller('scraped-pages')
export class ScrapedPagesController {
  constructor(private readonly scrapedPagesService: ScrapedPagesService) {}

  // Creates a new scrape job for a website profile and returns the job ID
  @Post('scrape')
  async createScrapeJob(@Body() dto: CreateScrapeJobDto): Promise<{ jobId: string }> {
    const job = await this.scrapedPagesService.createScrapeJob(dto);
    return { jobId: (job.jobId as string) };
  }

  // Returns the status and result of a scrape job by job ID
  @Get('job/:jobId')
  async getScrapeJobStatus(@Param('jobId') jobId: string): Promise<ScrapeJobDocument | null> {
    const res = await this.scrapedPagesService.getScrapeJobStatus(jobId);
    return res;
  }

  // Returns the latest scrape job for a given websiteProfileId
  @Get('latest-job')
  async getLatestJobByProfile(@Query('websiteProfileId') websiteProfileId: string) {
    const job = await this.scrapedPagesService.getLatestJobByProfile(websiteProfileId);
    return { job };
  }
}

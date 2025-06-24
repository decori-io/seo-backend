import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScrapedPage, ScrapedPageDocument } from './schemas/scraped-page.schema';
import { PageClassifier } from '../shared/utils/page-classifier.util';
import { FirecrawlDocument } from '@mendable/firecrawl-js';
import { ScrapeJob, ScrapeJobDocument, ScrapeJobStatus } from './schemas/scrape-job.schema';
import { CreateScrapeJobDto } from './dto/create-scrape-job.dto';
import { CrawlService } from '../shared/services/crawl.service';

@Injectable()
export class ScrapedPagesService {
  constructor(
    @InjectModel(ScrapedPage.name)
    private readonly scrapedPageModel: Model<ScrapedPageDocument>,
    @InjectModel(ScrapeJob.name)
    private readonly scrapeJobModel: Model<ScrapeJobDocument>,
    private readonly crawlService: CrawlService,
  ) {}

  async bulkCreateFromFirecrawl(
    pages: FirecrawlDocument[],
    websiteProfileId: Types.ObjectId,
  ): Promise<ScrapedPageDocument[]> {
    const pagesToCreate = pages.reduce(
      (acc, page) => {
        if (page.metadata?.url) {
          const pageType = PageClassifier.classify(page.metadata?.url);
          acc.push({
            url: page.metadata?.url,
            type: pageType,
            context: page,
            websiteProfileId: websiteProfileId,
          });
        }
        return acc;
      },
      [] as Omit<ScrapedPage, 'createdAt' | 'updatedAt'>[],
    );

    if (pagesToCreate.length === 0) {
      return [];
    }

    return this.scrapedPageModel.insertMany(pagesToCreate);
  }

  // Creates a new scrape job by first starting the Firecrawl job, then saving the ScrapeJob with the vendor jobId
  async createScrapeJob(dto: CreateScrapeJobDto): Promise<ScrapeJobDocument> {
    // Step 1: Start the Firecrawl job using the CrawlService
    let firecrawlJobId: string;
    try {
      const result = await this.crawlService.startCrawl(dto.domain);
      firecrawlJobId = result.jobId;
    } catch (err) {
      // If Firecrawl fails, throw an error and do not save the job
      throw new Error('Failed to start Firecrawl job: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Step 2: Save the ScrapeJob in Mongo with the vendor jobId and status 'processing'
    const job = new this.scrapeJobModel({
      websiteProfileId: new Types.ObjectId(dto.websiteProfileId),
      domain: dto.domain,
      status: ScrapeJobStatus.Processing,
      resultPageIds: [],
      error: null,
      jobId: firecrawlJobId,
    });
    return job.save();
  }

  // Retrieves a scrape job by its ID
  async getScrapeJobStatus(jobId: string): Promise<ScrapeJobDocument | null> {
    return this.scrapeJobModel.findOne({ jobId: jobId}).exec();
  }

  /**
   * Processes a scrape job: polls Firecrawl, saves results, updates job status.
   * @param jobId - The MongoDB _id of the ScrapeJob document.
   */
  async processScrapeJob(jobId: string): Promise<void> {
    const job = await this.scrapeJobModel.findById(jobId);
    if (!job) throw new Error('ScrapeJob not found');
    if (!job.jobId) throw new Error('No vendor jobId on ScrapeJob');
    if (job.status === ScrapeJobStatus.Complete) return; // Already done

    try {
      // Step 1: Poll Firecrawl for job completion
      const timeout = 3 * 60 * 1000; // 3 minutes
      const interval = 3000; // 3 seconds
      const start = Date.now();
      let response;
      while (Date.now() - start < timeout) {
        response = await this.crawlService.checkCrawlStatus(job.jobId);
        if (response.status === 'completed') break;
        if (response.status === 'failed' || response.status === 'cancelled') {
          throw new Error('Scrape error: Job failed or cancelled');
        }
        await new Promise(res => setTimeout(res, interval));
      }
      if (!response || response.status !== 'completed') {
        throw new Error('Scrape did not complete within 3 minutes');
      }

      // Step 2: Save/classify pages and update job with resultPageIds
      if (!response.data?.length) {
        job.status = ScrapeJobStatus.Complete;
        job.resultPageIds = [];
        await job.save();
        return;
      }
      const savedPages = await this.bulkCreateFromFirecrawl(response.data, job.websiteProfileId);
      job.status = ScrapeJobStatus.Complete;
      job.resultPageIds = savedPages.map(p => (p._id as Types.ObjectId));
      await job.save();
    } catch (err) {
      // Step 3: On error, update job status to 'failed' and save error
      job.status = ScrapeJobStatus.Failed;
      job.error = err instanceof Error ? err.message : String(err);
      await job.save();
    }
  }

  // Returns the latest scrape job for a given websiteProfileId
  async getLatestJobByProfile(websiteProfileId: string): Promise<ScrapeJobDocument | null> {
    const result = await this.scrapeJobModel.findOne({ websiteProfileId: new Types.ObjectId(websiteProfileId) })
      .sort({ createdAt: -1 })
      .exec();
    return result
  }
}

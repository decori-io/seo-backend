import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScrapedPage, ScrapedPageDocument } from './schemas/scraped-page.schema';
import { PageClassifier } from '../shared/utils/page-classifier.util';
import { FirecrawlDocument } from '@mendable/firecrawl-js';
import { ScrapeJob, ScrapeJobDocument, ScrapeJobStatus } from './schemas/scrape-job.schema';
import { CreateScrapeJobDto } from './dto/create-scrape-job.dto';
import { CrawlService } from '../shared/services/crawl.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    const results: ScrapedPageDocument[] = [];

    for (const page of pages) {
      if (page.metadata?.url) {
        const pageType = PageClassifier.classify(page.metadata?.url);
        
        // Use findOneAndUpdate with upsert to overwrite existing documents with same URL + websiteProfileId
        const savedPage = await this.scrapedPageModel.findOneAndUpdate(
          { url: page.metadata.url, websiteProfileId: websiteProfileId }, // Find by URL + websiteProfileId
          {
            url: page.metadata.url,
            type: pageType,
            context: page,
            websiteProfileId: websiteProfileId,
          },
          { 
            upsert: true, // Create if doesn't exist, update if exists
            new: true, // Return the updated document
            setDefaultsOnInsert: true // Set default values when inserting
          }
        );
        
        if (savedPage) {
          results.push(savedPage);
        }
      }
    }

    return results;
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
   * Uses atomic update to prevent race conditions and handles stale processing.
   * @param jobId - The MongoDB _id of the ScrapeJob document.
   */
  async processScrapeJob(jobId: string): Promise<void> {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    
    // Atomic update: process if not being processed OR if processing is stale
    const job = await this.scrapeJobModel.findOneAndUpdate(
      { 
        _id: jobId, 
        status: ScrapeJobStatus.Processing,
        $or: [
          { processingStartedAt: null }, // Never processed
          { processingStartedAt: { $lt: staleThreshold } } // Stale processing (>10 min)
        ]
      },
      { 
        $set: { processingStartedAt: new Date() } 
      },
      { new: true }
    ).populate('websiteProfileId', 'domain _id');

    if (!job) {
      // Job is already being processed, completed, or doesn't exist
      return;
    }

    const websiteProfile = job.websiteProfileId as any;
    const domain = websiteProfile?.domain || 'unknown';
    
    console.log(`[job_process][${domain}] Started processing job ${jobId} - Firecrawl JobId: ${job.jobId}`);

    if (!job.jobId) {
      console.error(`[job_process][${domain}] No vendor jobId on ScrapeJob ${jobId}`);
      throw new Error('No vendor jobId on ScrapeJob');
    }

    try {
      // Step 1: Poll Firecrawl for job completion
      console.log(`[job_process][${domain}] Polling Firecrawl for job completion...`);
      const timeout = 3 * 60 * 1000; // 3 minutes
      const interval = 3000; // 3 seconds
      const start = Date.now();
      let response;
      let pollCount = 0;
      
      while (Date.now() - start < timeout) {
        pollCount++;
        response = await this.crawlService.checkCrawlStatus(job.jobId);
        console.log(`[job_process][${domain}] Poll ${pollCount}: status=${response.status}, completed=${response.completed || 0}, total=${response.total || 0}`);
        
        if (response.status === 'completed') break;
        if (response.status === 'failed' || response.status === 'cancelled') {
          throw new Error(`Scrape error: Job ${response.status}`);
        }
        await new Promise(res => setTimeout(res, interval));
      }
      
      if (!response || response.status !== 'completed') {
        throw new Error('Scrape did not complete within 3 minutes');
      }

      console.log(`[job_process][${domain}] Firecrawl job completed after ${pollCount} polls - ${response.data?.length || 0} pages found`);

      // Step 2: Save/classify pages and update job with resultPageIds
      if (!response.data?.length) {
        job.status = ScrapeJobStatus.Complete;
        job.resultPageIds = [];
        await job.save();
        console.log(`[job_process][${domain}] Completed job ${jobId} - No pages found`);
        return;
      }
      
      console.log(`[job_process][${domain}] Saving and classifying ${response.data.length} pages...`);
      const savedPages = await this.bulkCreateFromFirecrawl(response.data, job.websiteProfileId);
      job.status = ScrapeJobStatus.Complete;
      job.resultPageIds = savedPages.map(p => (p._id as Types.ObjectId));
      await job.save();
      
      console.log(`[job_process][${domain}] Completed job ${jobId} - Successfully saved ${savedPages.length} pages`);
    } catch (err) {
      // Step 3: On error, update job status to 'failed' and save error
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[job_process][${domain}] Failed job ${jobId} - Error: ${errorMessage}`);
      
      job.status = ScrapeJobStatus.Failed;
      job.error = errorMessage;
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

  // Scheduled job: processes pending scrape jobs and marks stale ones every 20 seconds
  @Cron('*/20 * * * * *') // Every 20 seconds
  async processScheduledJobs(): Promise<void> {
    console.log('[process_schedule] Starting scheduled job processing...');
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    // Find jobs that need processing (never processed or stale)
    const jobsToProcess = await this.scrapeJobModel.find({
      status: ScrapeJobStatus.Processing,
      $or: [
        { processingStartedAt: null }, // Never processed
        { processingStartedAt: { $lt: staleThreshold } } // Stale processing (>5 min)
      ],
    })
    .populate('websiteProfileId', 'domain _id') // Populate website profile with domain and _id
    .limit(5); // Process max 5 jobs at once

    if (jobsToProcess.length === 0) {
      console.log('[process_schedule] No jobs found to process');
      return;
    }

    console.log(`[process_schedule] Found ${jobsToProcess.length} jobs to process`);

    for (const job of jobsToProcess) {
      const websiteProfile = job.websiteProfileId as any;
      const domain = websiteProfile?.domain || 'unknown';
      const profileId = websiteProfile?._id || 'unknown';
      
      console.log(`[process_schedule][${domain}] Starting job processing - JobId: ${job._id}, ProfileId: ${profileId}`);
      
      // Use fire-and-forget to process each job with enhanced logging
      this.processScrapeJob((job._id as string)).catch(err => {
        console.error(`[process_schedule][${domain}] Failed to process job ${job._id},ProfileId: ${profileId}:`, err.message || err);
      }).then(() => {
        console.log(`[process_schedule][${domain}] Successfully processed job ${job._id},ProfileId: ${profileId}`);
      });
    }

    console.log('[process_schedule] Scheduled job processing completed');
  }
}

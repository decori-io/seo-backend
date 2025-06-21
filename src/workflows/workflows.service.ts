import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { WebsiteProfilesService } from '../website-profiles/website-profiles.service';
import { CrawlService } from '../shared/services/crawl.service';
import { WebsiteProfileDocument } from '../website-profiles/schemas/website-profile.schema';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly websiteProfilesService: WebsiteProfilesService,
    private readonly crawlService: CrawlService,
  ) {}

  /**
   * Orchestrates the scraping workflow for a website profile.
   * It prevents starting a new scrape if a recent one (within 10 minutes) is already in progress.
   *
   * @param id - The ID of the website profile.
   * @returns The result of the scrape completion.
   */
  async scrapeWebsiteWorkflow(id: string): Promise<any /* TODO: fix this */> {
    const profile = await this.fetchWebsiteProfile(id);
    let jobId = profile.jobId;

    const isJobRecent = this.isJobRecent(profile.lastScrapedAt);

    if (!jobId || !isJobRecent) {
      jobId = await this.startScrape(profile.domain);
      await this.websiteProfilesService.update(id, {
        jobId,
        lastScrapedAt: new Date(),
      });
    }

    const result = await this.waitForScrapeCompletion(jobId);
    return result; // TODO: fix this return type
  }

  /**
   * Fetches a website profile by its ID.
   * @param id - The ID of the website profile.
   * @returns The website profile document.
   * @throws NotFoundException if the profile is not found.
   */
  private async fetchWebsiteProfile(id: string): Promise<WebsiteProfileDocument> {
    const profile = await this.websiteProfilesService.findById(id);
    if (!profile) throw new NotFoundException('Website profile not found');
    return profile;
  }

  /**
   * Determines if a job was started recently (within the last 10 minutes).
   * @param lastScrapedAt - The date when the last scrape was started.
   * @returns True if the job is recent, false otherwise.
   */
  private isJobRecent(lastScrapedAt: Date | null | undefined): boolean {
    if (!lastScrapedAt) {
      return false;
    }
    const tenMinutesInMillis = 10 * 60 * 1000;
    const timeDifference = new Date().getTime() - new Date(lastScrapedAt).getTime();
    return timeDifference < tenMinutesInMillis;
  }

  /**
   * Starts a new scrape for the given domain.
   * @param domain - The domain to scrape.
   * @returns The job ID of the started scrape.
   * @throws InternalServerErrorException if the scrape fails to start.
   */
  private async startScrape(domain: string): Promise<string> {
    try {
      const { jobId } = await this.crawlService.startCrawl(domain, { maxDepth: 3, limit: 50 });
      return jobId;
    } catch (error) {
      throw new InternalServerErrorException('Failed to start scrape: ' + error.message);
    }
  }

  /**
   * Waits for the scrape job to complete.
   * @param jobId - The ID of the job to wait for.
   * @returns The status and data of the completed job.
   * @throws InternalServerErrorException if the job fails, is cancelled, or times out.
   */
  private async waitForScrapeCompletion(jobId: string): Promise<{ status: string; data?: any }> {
    const timeout = 3 * 60 * 1000; // 3 minutes
    const interval = 3000; // 3 seconds
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await this.crawlService.checkCrawlStatus(jobId);
      if (status.status === 'completed') {
        return {
          status: status.status,
          data: status.data,
        };
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new InternalServerErrorException('Scrape error: Job failed or cancelled');
      }
      await new Promise(res => setTimeout(res, interval));
    }
    throw new InternalServerErrorException('Scrape did not complete within 3 minutes');
  }
} 
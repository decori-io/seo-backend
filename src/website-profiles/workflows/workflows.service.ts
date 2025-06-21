import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { WebsiteProfilesService } from '../website-profiles.service';
import { CrawlService } from '../../shared/services/crawl.service';
import { WebsiteProfileDocument } from '../schemas/website-profile.schema';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly websiteProfilesService: WebsiteProfilesService,
    private readonly crawlService: CrawlService,
  ) {}

  async scrapeWebsiteWorkflow(id: string): Promise<any /* TODO: fix this */> {
    const profile = await this.fetchWebsiteProfile(id);
    const jobId = await this.startScrape(profile.domain);
    const result = await this.waitForScrapeCompletion(jobId);
    return null as any; // TODO: fix this
  }

  private async fetchWebsiteProfile(id: string): Promise<WebsiteProfileDocument> {
    const profile = await this.websiteProfilesService.findById(id);
    if (!profile) throw new NotFoundException('Website profile not found');
    return profile;
  }

  private async startScrape(domain: string): Promise<string> {
    try {
      const { jobId } = await this.crawlService.startCrawl(domain, { maxDepth: 3, limit: 50 });
      return jobId;
    } catch (error) {
      throw new InternalServerErrorException('Failed to start scrape: ' + error.message);
    }
  }

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
import { Injectable } from '@nestjs/common';
import FirecrawlApp, {
  CrawlParams,
  CrawlResponse,
  CrawlStatusResponse,
  ErrorResponse,
  CrawlScrapeOptions,
} from '@mendable/firecrawl-js';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class CrawlService {
  private readonly app: FirecrawlApp;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('FIRE_CRAWL_API_KEY');
    this.app = new FirecrawlApp({ apiKey });
  }

  /**
   * Starts a crawl job and returns the jobId
   */
  async startCrawl(
    url: string,
    options?: CrawlParams,
  ): Promise<{ jobId: string }> {
    const result = await this.app.asyncCrawlUrl(url, options);
    if ('success' in result && result.success && result.id) {
      return { jobId: result.id };
    }
    throw new Error(
      'Failed to start crawl: ' + ('error' in result ? result.error : 'Unknown error'),
    );
  }

  /**
   * Checks the status of a crawl job by jobId
   */
  async checkCrawlStatus(jobId: string): Promise<CrawlStatusResponse> {
    try{
        const result = await this.app.checkCrawlStatus(jobId);
        return result as CrawlStatusResponse;
    } catch (error) {
        throw new Error(
            'Failed to check crawl status: ' + ('error' in error ? error.error : 'Unknown error'),
        );
    }
  }
} 
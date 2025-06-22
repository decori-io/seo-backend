import { Controller, Post, HttpException, HttpStatus, Body } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';

@Controller('/workflow')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('scrape_site')
  async scrape(@Body() scrapeRequest: ScrapeRequestDto): Promise<any> {
    try {
      const result =  await this.workflowsService.scrapeWebsiteWorkflow(scrapeRequest.websiteProfileID);
      return result;
    } catch (error) {
      throw new HttpException(error.message || 'Scrape failed', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 
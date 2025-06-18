import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { ScrapeResultDto } from './dto/scrape-result.dto';

@Controller('website/:id/workflow')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('scrape')
  async scrape(@Param('id') id: string): Promise<ScrapeResultDto> {
    try {
      return await this.workflowsService.scrapeWebsiteWorkflow(id);
    } catch (error) {
      throw new HttpException(error.message || 'Scrape failed', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 
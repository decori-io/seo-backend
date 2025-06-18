import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { WebsiteProfilesModule } from '../website-profiles.module';
import { WorkflowsService } from './workflows.service';
import { WebsiteProfilesService } from '../website-profiles.service';
import { CrawlService } from '../../shared/services/crawl.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebsiteProfile } from '../schemas/website-profile.schema';
import { checkCrawlStatusFixture } from 'src/shared/services/crawl.service.fixtures';

describe('WorkflowsController (e2e)', () => {
  let app: INestApplication;
  let websiteProfileModel: Model<WebsiteProfile>;

  const mockWebsiteProfile = {
    _id: '507f1f77bcf86cd799439011',
    domain: 'example.com',
    userId: '507f1f77bcf86cd799439012',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCrawlService = {
    startCrawl: jest.fn().mockResolvedValue({ jobId: 'job-123' }),
    checkCrawlStatus: jest.fn().mockResolvedValue({ status: 'completed', data: checkCrawlStatusFixture }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebsiteProfilesModule],
    })
      .overrideProvider(CrawlService)
      .useValue(mockCrawlService)
      .overrideProvider(getModelToken(WebsiteProfile.name))
      .useValue({
        findById: jest.fn().mockReturnValue({ exec: () => Promise.resolve(mockWebsiteProfile) }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /website/:id/workflow/scrape - happy path', async () => {
    const res = await request(app.getHttpServer())
      .post(`/website/${mockWebsiteProfile._id}/workflow/scrape`)
      .expect(HttpStatus.CREATED || HttpStatus.OK);

    expect(res.body).toHaveProperty('jobId', 'job-123');
    expect(res.body).toHaveProperty('status', 'completed');
    expect(res.body).toHaveProperty('data');
  });
}); 
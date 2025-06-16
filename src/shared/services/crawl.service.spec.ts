import { Test, TestingModule } from '@nestjs/testing';
import { CrawlService } from './crawl.service';
import { startCrawlFixture, checkCrawlStatusFixture } from './crawl.service.fixtures';
import { ConfigService } from '@nestjs/config';

describe('CrawlService (stubbed)', () => {
  let service: CrawlService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('fake-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<CrawlService>(CrawlService);

    // Stub the methods
    jest.spyOn(service, 'startCrawl').mockResolvedValue(startCrawlFixture);
    jest.spyOn(service, 'checkCrawlStatus').mockResolvedValue(checkCrawlStatusFixture as any);
  });

  it('should return the fixture for startCrawl', async () => {
    const result = await service.startCrawl('https://socialwolvez.com', { limit: 1 });
    expect(result).toEqual(startCrawlFixture);
  });

  it('should return the fixture for checkCrawlStatus', async () => {
    const result = await service.checkCrawlStatus('2eea80b1-0716-493a-8e81-bbec6bb0075a');
    expect(result).toEqual(checkCrawlStatusFixture);
  });
}); 
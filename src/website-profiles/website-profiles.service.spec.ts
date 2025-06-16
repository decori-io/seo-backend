import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteProfilesService } from './website-profiles.service';

describe('WebsiteProfilesService', () => {
  let service: WebsiteProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebsiteProfilesService],
    }).compile();

    service = module.get<WebsiteProfilesService>(WebsiteProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

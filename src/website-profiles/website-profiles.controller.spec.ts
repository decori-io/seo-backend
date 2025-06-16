import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteProfilesController } from './website-profiles.controller';

describe('WebsiteProfilesController', () => {
  let controller: WebsiteProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebsiteProfilesController],
    }).compile();

    controller = module.get<WebsiteProfilesController>(WebsiteProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

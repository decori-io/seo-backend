import { Test, TestingModule } from '@nestjs/testing';
import { SemanticUnderstandingController } from './semantic-understanding.controller';

describe('SemanticUnderstandingController', () => {
  let controller: SemanticUnderstandingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SemanticUnderstandingController],
    }).compile();

    controller = module.get<SemanticUnderstandingController>(SemanticUnderstandingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

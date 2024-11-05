import { Test, TestingModule } from '@nestjs/testing';
import { BxbService } from './bxb.service';

describe('BxbService', () => {
  let service: BxbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BxbService],
    }).compile();

    service = module.get<BxbService>(BxbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

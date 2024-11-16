import { Test, TestingModule } from '@nestjs/testing';
import { DpdService } from './dpd.service';

describe('DpdService', () => {
  let service: DpdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DpdService],
    }).compile();

    service = module.get<DpdService>(DpdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

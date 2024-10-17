import { Test, TestingModule } from '@nestjs/testing';
import { YadService } from './yad.service';

describe('YadService', () => {
  let service: YadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YadService],
    }).compile();

    service = module.get<YadService>(YadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

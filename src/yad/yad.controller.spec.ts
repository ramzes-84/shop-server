import { Test, TestingModule } from '@nestjs/testing';
import { YadController } from './yad.controller';
import { YadService } from './yad.service';

describe('YadController', () => {
  let controller: YadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YadController],
      providers: [YadService],
    }).compile();

    controller = module.get<YadController>(YadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

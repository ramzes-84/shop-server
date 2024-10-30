import { Test, TestingModule } from '@nestjs/testing';
import { YaModule } from './ya.module';
import { YaService } from './ya.service';
import { YaController } from './ya.controller';

describe('YaModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [YaModule],
    }).compile();
  });

  it('should be defined', () => {
    const yaModule = module.get<YaModule>(YaModule);
    expect(yaModule).toBeDefined();
  });

  it('should provide YaService', () => {
    const yaService = module.get<YaService>(YaService);
    expect(yaService).toBeDefined();
  });

  it.skip('should provide YaController', () => {
    const yaController = module.get<YaController>(YaController);
    expect(yaController).toBeDefined();
  });
});
